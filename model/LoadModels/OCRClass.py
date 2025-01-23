import cv2
import numpy as np
import torch
from paddleocr import PaddleOCR
import os

class OCRClass():
    def __init__(self, device, 
                 det_model_path="C:/Users/Wei/Downloads/AI_Gauge_Reader/model/LoadModels/OCR model/ch_PP-OCRv4_det_server_infer",
                 rec_model_path="C:/Users/Wei/Downloads/AI_Gauge_Reader/model/LoadModels/OCR model/ch_PP-OCRv4_rec_server_infer",
                 device_details=""):
        self.ocr_model = PaddleOCR(
                            use_gpu=True,
                            use_angle_cls=True,
                            det_model_dir=det_model_path,
                            rec_model_dir=rec_model_path)
        self.device = device
        self.device_details = device_details

    def ocr_det_rec(self, roi):
        result = self.ocr_model.ocr(roi, cls=True)
        boxes, txts, scores = [], [], []
        
        if result[0] is not None:
            for line in result[0]:
                score = float(line[1][1])
                if score >= 0.85:
                    boxes.append(line[0])
                    txts.append(line[1][0])
                    scores.append(score)
        else:
            print("No Text Detected")
        return boxes, txts, scores
    
    def annotate(self, roi, boxes, txts, scores):
        for box, text, score in zip(boxes, txts, scores):
            # Convert box coordinates to integer
            box = [(int(x), int(y)) for x, y in box]
            # Draw the polygon around the text
            cv2.polylines(roi, [np.array(box)], isClosed=True, color=(255, 0, 0), thickness=1)
            # Put the text label near the polygon
            label = f"{text} ({score:.2f})"
            cv2.putText(roi, label, (box[0][0], box[0][1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
