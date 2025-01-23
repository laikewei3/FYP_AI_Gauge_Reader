import torch
from model.LoadModels.YoloDetectionModel import YoloDetectionModel
import os

class GaugeModelClass(YoloDetectionModel): 
    def __init__(self, device, model_path="C:/Users/Wei/Downloads/AI_Gauge_Reader/model/LoadModels/models/yolo9best1.pt", device_details=""):
        model = torch.hub.load('WongKinYiu/yolov9', 'custom', 
                                       model_path,
                                       force_reload=False, trust_repo=True)
        YoloDetectionModel.__init__(self, model, device, device_details)