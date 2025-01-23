from deep_sort_realtime.deepsort_tracker import DeepSort
import cv2

class TrackerClass():
    def __init__(self):
        self.gauge_tracker = DeepSort(
                    max_age=2,        # Maximum age of tracks to keep
                    n_init=10,          # Minimum detections before a track is confirmed
                    nms_max_overlap=0.8  # Non-maxima suppression threshold
                )
        
    def process_tracks(self, tracks):
        tracks_ids, tracks_det_classes, tracks_rois = [], [], []
        for track in tracks:
            if not track.is_confirmed():
                continue
            tracks_ids.append(track.track_id)
            tracks_det_classes.append(track.det_class)
            x1, y1, x2, y2 = track.to_tlbr()
            tracks_rois.append([int(x1), int(y1), int(x2), int(y2)])
        return tracks_ids, tracks_det_classes, tracks_rois 


    # Function for bounding box and ID annotation.
    def annotate(self, tracks_ids, tracks_det_classes, tracks_rois, frame):
        for track_id, track_det_class, track_roi in zip(tracks_ids, tracks_det_classes, tracks_rois):
            x1, y1, x2, y2 = track_roi
            p1 = (x1, y1)
            p2 = (x2, y2)
            # Annotate boxes.
            cv2.rectangle(
                frame,
                p1,
                p2,
                color=(255,0,0),
                thickness=2
            )
            # Annotate ID.
            cv2.putText(
                frame, f"{track_id}",
                (p1[0], p1[1] - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 0, 0),
                2,
                lineType=cv2.LINE_AA
            )
        return frame