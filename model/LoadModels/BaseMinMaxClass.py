import cv2
import torch
from model.LoadModels.YoloDetectionModel import YoloDetectionModel
import os

class BaseMinMaxClass(YoloDetectionModel):
    def __init__(self, device, model_path="C:/Users/Wei/Downloads/AI_Gauge_Reader/model/LoadModels/models/base_min_max_30.pt", device_details=""):
        model = torch.hub.load('WongKinYiu/yolov9', 'custom', 
                                    model_path,
                                    force_reload=False, trust_repo=True)
        YoloDetectionModel.__init__(self, model, device, device_details)

    def annotate(self, roi, result):
        for p in result:
            point_coord, point_conf, point_category = p
            x, y, w, h = point_coord

            if point_category == "base":
                color = (0, 0, 255)
            elif point_category == "minimum":
                color = (0, 255, 0)
            elif point_category == "maximum":
                color = (0, 165, 255)
            cv2.circle(roi, (int((x + x + w) / 2), int((y + y + h) / 2)), radius=5, color=color, thickness=-1)