import torch
import torch.nn.functional as F
import torchvision
import numpy as np
import cv2
import math
import os

class NeedleSegmentClass():
    def __init__(self, device, model_path="C:/Users/Wei/Downloads/AI_Gauge_Reader/model/LoadModels/models/needle_segmentation_50.pt", device_details=""):
        self.needle_segmetation_model = torch.hub.load('WongKinYiu/yolov9', 'custom', 
                                          model_path,
                                          force_reload=False, trust_repo=True)
        self.device = device
        self.device_details = device_details
        self.needle_segmetation_model.eval().to(self.device)
    
    def get_needle_binary_mask(self, needle_mask):
        gray_mask = cv2.cvtColor(needle_mask, cv2.COLOR_BGR2GRAY)

        # Threshold the grayscale mask to create a binary mask
        _, binary_inv_mask = cv2.threshold(gray_mask, 240, 255, cv2.THRESH_BINARY_INV)

        return cv2.bitwise_not(binary_inv_mask), binary_inv_mask

    def annotate(self, roi, needle_mask):
        binary_mask, binary_inv_mask = self.get_needle_binary_mask(needle_mask[0])

        # Separate the purple part (mask) from the mask
        purple_mask = cv2.bitwise_and(needle_mask[0], needle_mask[0], mask=binary_inv_mask)

        # Blend the purple mask with the original image
        return cv2.bitwise_and(roi, roi, mask=binary_mask) + purple_mask

    def segment_annotation(self, roi_tensor, det, masks, ori_size, alpha=0.5):
        colors = [(255, 0, 157)]

        if len(masks) == 0:
            roi_tensor = roi_tensor.permute(1, 2, 0).contiguous().cpu().numpy() * 255

        colors = np.asarray(colors, dtype=np.float32)  # shape(n,3)
        colors = torch.tensor(colors, device=roi_tensor.device, dtype=torch.float32) / 255.0
        colors = colors[:, None, None]  # shape(n,1,1,3)

        masks = masks.unsqueeze(3)  # shape(n,h,w,1)
        masks_color = masks * (colors * alpha)  # shape(n,h,w,3)

        inv_alph_masks = (1 - masks * alpha).cumprod(0)  # shape(n,h,w,1)
        mcs = (masks_color * inv_alph_masks).sum(0) * 2  # mask color summand shape(n,h,w,3)

        roi_tensor = roi_tensor.flip(dims=[0])  # flip channel
        roi_tensor = roi_tensor.squeeze(0)
        roi_tensor = roi_tensor.permute(1, 2, 0).contiguous()  # shape(h,w,3)

        roi_tensor = inv_alph_masks[-1] + mcs#roi_tensor * inv_alph_masks[-1] + mcs

        im_mask = (roi_tensor*255).byte().cpu().numpy()
        return cv2.resize(im_mask, (ori_size[1], ori_size[0]))
    
    def segmentation_needle(self, roi):
        try:
            list_of_points = []
            img_size = (640, 640)
            pt = self.needle_segmetation_model.pt
            self.needle_segmetation_model.warmup(imgsz=(1 if pt else 1, 3, *img_size))

            roi_resized = cv2.resize(roi, img_size)
            # Add an extra dimension for batch size and transfer to CUDA device
            roi_tensor = torch.from_numpy(roi_resized.transpose(2, 0, 1)).unsqueeze(0).to(self.device)
            roi_tensor = roi_tensor.half() if self.needle_segmetation_model.fp16 else roi_tensor.float()  # uint8 to fp16/32
            roi_tensor /= 255  # 0 - 255 to 0.0 - 1.0
            roi_copy = roi.copy()
            # Perform inference
            with torch.no_grad():
                pred, proto = self.needle_segmetation_model(roi_tensor)[:2]
                pred = self.non_max_suppression(pred, nm=32, conf_thres=0.8)
                seen = 0

                # Process predictions
                for _, det in enumerate(pred):  # per image
                    seen += 1
                    if len(det):
                        masks = self.process_mask(proto[2].squeeze(0), det[:, 6:], det[:, :4], roi_tensor.shape[2:], upsample=True)
                        det[:, :4] = self.scale_boxes(roi_tensor.shape[2:], det[:, :4], roi_tensor.shape).round()  # rescale boxes to im0 size

                        roi_copy= self.segment_annotation(roi_tensor, det, masks, ori_size = roi.shape)
                        # Find contours
                        contours, _ = cv2.findContours(cv2.resize(masks.squeeze(0).cpu().numpy().astype(np.uint8), (roi.shape[1], roi.shape[0])), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                        cnt = max(contours, key=cv2.contourArea)
                        # Find the extreme points
                        points = {
                            "leftmost": np.array(cnt[cnt[:, :, 0].argmin()][0]),
                            "rightmost": np.array(cnt[cnt[:, :, 0].argmax()][0]),
                            "topmost": np.array(cnt[cnt[:, :, 1].argmin()][0]),
                            "bottommost": np.array(cnt[cnt[:, :, 1].argmax()][0])
                        }

                        list_of_points.append(points)
            return roi_copy, list_of_points, contours
        except Exception as error:
            print("Segmentation Needle Error:",error)
    
    def non_max_suppression(
            self,
            prediction,
            conf_thres=0.25,
            iou_thres=0.45,
            classes=None,
            agnostic=False,
            multi_label=False,
            labels=(),
            max_det=300,
            nm=0,  # number of masks
        ):
        """Non-Maximum Suppression (NMS) on inference results to reject overlapping detections

        Returns:
            list of detections, on (n,6) tensor per image [xyxy, conf, cls]
        """
        if isinstance(prediction, (list, tuple)):  # YOLO model in validation model, output = (inference_out, loss_out)
            prediction = prediction[0]  # select only inference output

        bs = prediction.shape[0]  # batch size
        nc = prediction.shape[1] - nm - 4  # number of classes
        mi = 4 + nc  # mask start index
        xc = prediction[:, 4:mi].amax(1) > conf_thres  # candidates

        # Settings
        # min_wh = 2  # (pixels) minimum box width and height
        max_wh = 7680  # (pixels) maximum box width and height
        max_nms = 30000  # maximum number of boxes into torchvision.ops.nms()
        redundant = True  # require redundant detections
        multi_label &= nc > 1  # multiple labels per box (adds 0.5ms/img)
        merge = False  # use merge-NMS

        output = [torch.zeros((0, 6 + nm), device=prediction.device)] * bs
        for xi, x in enumerate(prediction):  # image index, image inference
            # Apply constraints
            # x[((x[:, 2:4] < min_wh) | (x[:, 2:4] > max_wh)).any(1), 4] = 0  # width-height
            x = x.T[xc[xi]]  # confidence

            # Cat apriori labels if autolabelling
            if labels and len(labels[xi]):
                lb = labels[xi]
                v = torch.zeros((len(lb), nc + nm + 5), device=x.device)
                v[:, :4] = lb[:, 1:5]  # box
                v[range(len(lb)), lb[:, 0].long() + 4] = 1.0  # cls
                x = torch.cat((x, v), 0)

            # If none remain process next image
            if not x.shape[0]:
                continue

            # Detections matrix nx6 (xyxy, conf, cls)
            box, cls, mask = x.split((4, nc, nm), 1)
            box = self.xywh2xyxy(box)  # center_x, center_y, width, height) to (x1, y1, x2, y2)
            if multi_label:
                i, j = (cls > conf_thres).nonzero(as_tuple=False).T
                x = torch.cat((box[i], x[i, 4 + j, None], j[:, None].float(), mask[i]), 1)
            else:  # best class only
                conf, j = cls.max(1, keepdim=True)
                x = torch.cat((box, conf, j.float(), mask), 1)[conf.view(-1) > conf_thres]

            # Filter by class
            if classes is not None:
                x = x[(x[:, 5:6] == torch.tensor(classes, device=x.device)).any(1)]

            # Check shape
            n = x.shape[0]  # number of boxes
            if not n:  # no boxes
                continue
            elif n > max_nms:  # excess boxes
                x = x[x[:, 4].argsort(descending=True)[:max_nms]]  # sort by confidence
            else:
                x = x[x[:, 4].argsort(descending=True)]  # sort by confidence

            # Batched NMS
            c = x[:, 5:6] * (0 if agnostic else max_wh)  # classes
            boxes, scores = x[:, :4] + c, x[:, 4]  # boxes (offset by class), scores
            i = torchvision.ops.nms(boxes, scores, iou_thres)  # NMS
            if i.shape[0] > max_det:  # limit detections
                i = i[:max_det]
            if merge and (1 < n < 3E3):  # Merge NMS (boxes merged using weighted mean)
                # update boxes as boxes(i,4) = weights(i,n) * boxes(n,4)
                iou = self.box_iou(boxes[i], boxes) > iou_thres  # iou matrix
                weights = iou * scores[None]  # box weights
                x[i, :4] = torch.mm(weights, x[:, :4]).float() / weights.sum(1, keepdim=True)  # merged boxes
                if redundant:
                    i = i[iou.sum(1) > 1]  # require redundancy

            output[xi] = x[i]
        return output
    
    def process_mask(self, protos, masks_in, bboxes, shape, upsample=False):
        """
        Crop before upsample.
        proto_out: [mask_dim, mask_h, mask_w]
        out_masks: [n, mask_dim], n is number of masks after nms
        bboxes: [n, 4], n is number of masks after nms
        shape:input_image_size, (h, w)

        return: h, w, n
        """

        c, mh, mw = protos.shape  # CHW
        ih, iw = shape
        masks = (masks_in @ protos.float().view(c, -1)).sigmoid().view(-1, mh, mw)  # CHW

        downsampled_bboxes = bboxes.clone()
        downsampled_bboxes[:, 0] *= mw / iw
        downsampled_bboxes[:, 2] *= mw / iw
        downsampled_bboxes[:, 3] *= mh / ih
        downsampled_bboxes[:, 1] *= mh / ih

        masks = self.crop_mask(masks, downsampled_bboxes)  # CHW
        if upsample:
            masks = F.interpolate(masks[None], shape, mode='bilinear', align_corners=False)[0]  # CHW
        return masks.gt_(0.5)
    
    def scale_boxes(self, img1_shape, boxes, img0_shape, ratio_pad=None):
        # Rescale boxes (xyxy) from img1_shape to img0_shape
        if ratio_pad is None:  # calculate from img0_shape
            gain = min(img1_shape[0] / img0_shape[0], img1_shape[1] / img0_shape[1])  # gain  = old / new
            pad = (img1_shape[1] - img0_shape[1] * gain) / 2, (img1_shape[0] - img0_shape[0] * gain) / 2  # wh padding
        else:
            gain = ratio_pad[0][0]
            pad = ratio_pad[1]

        boxes[:, [0, 2]] -= pad[0]  # x padding
        boxes[:, [1, 3]] -= pad[1]  # y padding
        boxes[:, :4] /= gain
        self.clip_boxes(boxes, img0_shape)
        return boxes

    def check_img_size(self, imgsz, s=32, floor=0):
        # Verify image size is a multiple of stride s in each dimension
        if isinstance(imgsz, int):  # integer i.e. img_size=640
            new_size = max(self.make_divisible(imgsz, int(s)), floor)
        else:  # list i.e. img_size=[640, 480]
            imgsz = list(imgsz)  # convert to list if tuple
            new_size = [max(self.make_divisible(x, int(s)), floor) for x in imgsz]
        return new_size

    def make_divisible(self, x, divisor):
        # Returns nearest x divisible by divisor
        if isinstance(divisor, torch.Tensor):
            divisor = int(divisor.max())  # to int
        return math.ceil(x / divisor) * divisor

    def scale_image(self, im1_shape, masks, im0_shape, ratio_pad=None):
        """
        img1_shape: model input shape, [h, w]
        img0_shape: origin pic shape, [h, w, 3]
        masks: [h, w, num]
        """
        # Rescale coordinates (xyxy) from im1_shape to im0_shape
        if ratio_pad is None:  # calculate from im0_shape
            gain = min(im1_shape[0] / im0_shape[0], im1_shape[1] / im0_shape[1])  # gain  = old / new
            pad = (im1_shape[1] - im0_shape[1] * gain) / 2, (im1_shape[0] - im0_shape[0] * gain) / 2  # wh padding
        else:
            pad = ratio_pad[1]
        top, left = int(pad[1]), int(pad[0])  # y, x
        bottom, right = int(im1_shape[0] - pad[1]), int(im1_shape[1] - pad[0])

        if len(masks.shape) < 2:
            raise ValueError(f'"len of masks shape" should be 2 or 3, but got {len(masks.shape)}')
        masks = masks[top:bottom, left:right]
        # masks = masks.permute(2, 0, 1).contiguous()
        # masks = F.interpolate(masks[None], im0_shape[:2], mode='bilinear', align_corners=False)[0]
        # masks = masks.permute(1, 2, 0).contiguous()
        masks = cv2.resize(masks, (im0_shape[1], im0_shape[0]))

        if len(masks.shape) == 2:
            masks = masks[:, :, None]
        return masks

    def clip_boxes(self, boxes, shape):
        # Clip boxes (xyxy) to image shape (height, width)
        if isinstance(boxes, torch.Tensor):  # faster individually
            boxes[:, 0].clamp_(0, shape[1])  # x1
            boxes[:, 1].clamp_(0, shape[0])  # y1
            boxes[:, 2].clamp_(0, shape[1])  # x2
            boxes[:, 3].clamp_(0, shape[0])  # y2
        else:  # np.array (faster grouped)
            boxes[:, [0, 2]] = boxes[:, [0, 2]].clip(0, shape[1])  # x1, x2
            boxes[:, [1, 3]] = boxes[:, [1, 3]].clip(0, shape[0])  # y1, y2

    def crop_mask(self, masks, boxes):
        """
        "Crop" predicted masks by zeroing out everything not in the predicted bbox.
        Vectorized by Chong (thanks Chong).

        Args:
            - masks should be a size [h, w, n] tensor of masks
            - boxes should be a size [n, 4] tensor of bbox coords in relative point form
        """

        n, h, w = masks.shape
        x1, y1, x2, y2 = torch.chunk(boxes[:, :, None], 4, 1)  # x1 shape(1,1,n)
        r = torch.arange(w, device=masks.device, dtype=x1.dtype)[None, None, :]  # rows shape(1,w,1)
        c = torch.arange(h, device=masks.device, dtype=x1.dtype)[None, :, None]  # cols shape(h,1,1)

        return masks * ((r >= x1) * (r < x2) * (c >= y1) * (c < y2))

    def xywh2xyxy(self, x):
        # Convert nx4 boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right
        y = x.clone() if isinstance(x, torch.Tensor) else np.copy(x)
        y[..., 0] = x[..., 0] - x[..., 2] / 2  # top left x
        y[..., 1] = x[..., 1] - x[..., 3] / 2  # top left y
        y[..., 2] = x[..., 0] + x[..., 2] / 2  # bottom right x
        y[..., 3] = x[..., 1] + x[..., 3] / 2  # bottom right y
        return y

    def box_iou(self, box1, box2, eps=1e-7):
        # https://github.com/pytorch/vision/blob/master/torchvision/ops/boxes.py
        """
        Return intersection-over-union (Jaccard index) of boxes.
        Both sets of boxes are expected to be in (x1, y1, x2, y2) format.
        Arguments:
            box1 (Tensor[N, 4])
            box2 (Tensor[M, 4])
        Returns:
            iou (Tensor[N, M]): the NxM matrix containing the pairwise
                IoU values for every element in boxes1 and boxes2
        """

        # inter(N,M) = (rb(N,M,2) - lt(N,M,2)).clamp(0).prod(2)
        (a1, a2), (b1, b2) = box1.unsqueeze(1).chunk(2, 2), box2.unsqueeze(0).chunk(2, 2)
        inter = (torch.min(a2, b2) - torch.max(a1, b1)).clamp(0).prod(2)

        # IoU = inter / (area1 + area2 - inter)
        return inter / ((a2 - a1).prod(2) + (b2 - b1).prod(2) - inter + eps)
