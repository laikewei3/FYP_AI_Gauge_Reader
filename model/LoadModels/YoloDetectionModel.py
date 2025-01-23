import torch

class YoloDetectionModel():
    def __init__(self, model, device, device_details=""):
        self.device = device
        self.device_details = device_details
        self.model = model
        self.model.eval().to(self.device)

    def create_bbox(self, x_min:int, y_min:int, x_max:int, y_max:int) -> list:
        """
        Creates a bounding box (bbox) from x_min, y_min, x_max and y_max.

        Args:
            x_min (int): Minimum x-coordinate (top-left corner).
            y_min (int): Minimum y-coordinate (top-left corner).
            x_max (int): Maximum x-coordinate (bottom-right corner).
            y_max (int): Maximum y-coordinate (bottom-right corner).

        Returns:
            list: Bounding box in the format [x_min, y_min, width, height].
        """
        width = abs(x_max - x_min)
        height = abs(y_max - y_min)

        return [x_min, y_min, width, height]
    
    def detection_yolo(self, im, conf=0.75):
        with torch.no_grad():
            results = self.model(im)
            results = results.pandas().xyxy[0]
        results_list = []
        # Iterate over the gauge_results rows
        for _, row in results.iterrows():
            print(row['confidence'], row['name'])
            if row['confidence'] > conf:
                results_list.append(
                    (
                        self.create_bbox(int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])),
                        row['confidence'],
                        row['name']
                    )
                )
        return results_list