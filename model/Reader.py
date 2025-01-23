import asyncio
from io import BytesIO
import os
import re
import unicodedata
from bson import ObjectId
import cv2
import numpy as np
import pandas as pd
from model.general_utils import (
    remove_shadow_gaussian, 
    calculate_central_angle, 
    get_nearest_edges, 
    remove_shadow_gaussian, 
    calculate_reading_angle,
    preprocess_image
    )
from model.LoadModels.TrackerClass import TrackerClass
import model.RansacMultipleLines as rml
from fuzzywuzzy import fuzz
import aiosmtplib
from email.message import EmailMessage
import pywhatkit as kit
import dotenv

async def send_email(to_email: str, subject: str, html_content: str):
    dotenv.load_dotenv(dotenv_path=os.getcwd()+".env")
    print("os.getcwd():", os.getcwd())
    GMAIL = str(os.getenv('GMAIL'))
    SMTP_PASSWORD = str(os.getenv('SMTP_PASSWORD'))
    print("SMTP_PASSWORD:", SMTP_PASSWORD)
    print("GMAIL:", GMAIL)
    # Function to send an email asynchronously
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    smtp_username = GMAIL
    smtp_password = SMTP_PASSWORD

    # Construct the email message
    message = EmailMessage()
    message["From"] = smtp_username
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content("This is a notification email")  # Optional plain text version
    message.add_alternative(html_content, subtype="html")  # HTML content

    # Send the email
    try:
        await aiosmtplib.send(
            message,
            hostname=smtp_server,
            port=smtp_port,
            username=smtp_username,
            password=smtp_password,
            start_tls=True
        )
        print("Email sent successfully")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_sms(to_phone: str, message: str):
    # Function to send a WhatsApp message
    try:
        # Send WhatsApp message
        kit.sendwhatmsg_instantly(to_phone, message)
        print("WhatsApp message sent successfully.")
    except Exception as e:
        print(f"Failed to send WhatsApp message: {e}")

class Reader:
    def __init__(self, user_id, source_id, source_type, source, 
                 gauge_detection_model, base_min_max_model, 
                 needle_segmentation_model, ocr_model, db, dropbox):
        # Initialize the Reader class with various parameters and models
        """
        Initialize the AIGaugeReader with the source path.
        The source can be a local video path, IP camera URL, or local camera index.
        """
        self.user_id = user_id
        self.source_id = source_id
        self.source = source
        self.source_type = source_type
        self.gauge_detection_model = gauge_detection_model
        self.ocr_model = ocr_model
        self.base_min_max_model = base_min_max_model
        self.needle_segmentation_model = needle_segmentation_model
        self.gauge_tracker = TrackerClass()
        self.running = True
        self.ocr_results = {}
        self.db = db
        self.dropbox_client = dropbox
        self.units = self.load_units()
        self._pause_event = asyncio.Event()
        self._pause_event.set()  # Initially not paused
        self.task = None
    
    def pause(self):
        # Pause the prediction loop
        self._pause_event.clear()

    def resume(self):
        # Resume the prediction loop
        self._pause_event.set()

    def load_units(self):
        # Load units from text files in the specified folder
        units = set()
        units_folder = "C:/Users/Wei/Downloads/AI_Gauge_Reader/model/Units"
        for filename in os.listdir(units_folder):
            if filename.endswith(".txt"):
                with open(os.path.join(units_folder, filename), "r", encoding="utf-8") as file:
                    for line in file:
                        # Remove text in brackets and normalize special characters
                        unit = re.sub(r'\(.*?\)', '', line).strip()
                        unit = unicodedata.normalize('NFC', unit)
                        units.add(unit)
        return units

    async def upload_to_dropbox(self, image, filename):
        # Upload an image to Dropbox and return the direct link
        print("Uploading image to Dropbox...")
        try:
            _, buffer = cv2.imencode('.jpg', image)
            image_bytes = BytesIO(buffer)
            response = self.dropbox_client.files_upload(image_bytes.getvalue(), f'/{filename}.jpg', mute=True)
            shared_link_metadata = self.dropbox_client.sharing_create_shared_link_with_settings(response.path_lower)
            shareable_link = shared_link_metadata.url
            direct_link = shareable_link.replace('&dl=0', '&raw=1')
            print("Image uploaded to Dropbox:", direct_link)
            return direct_link
        except Exception as e:
            print(f"Exception in upload_to_dropbox: {e}")
            return None

    def detect_gauge(self, im):
        # Detect gauge in the image using the detection model
        return self.gauge_detection_model.detection_yolo(im)

    def track_gauge(self, im, gauge_results):
        # Track the detected gauge in the image
        tracks = self.gauge_tracker.gauge_tracker.update_tracks(gauge_results, frame=im)
        tracks_ids, tracks_det_classes, tracks_rois = self.gauge_tracker.process_tracks(tracks)
        return tracks_ids, tracks_det_classes, tracks_rois
    
    async def predict(self):
        # Main prediction loop that processes video frames
        print("Prediction loop started.")
        
        while self.running:
            cap = cv2.VideoCapture(self.source)
            
            if not cap.isOpened():
                print(f"Failed to open video source: {self.source}. Retrying in 2 seconds...")
                await asyncio.sleep(2)
                continue

            print("Video source opened successfully.")
            
            while self.running:
                await self._pause_event.wait()
                ret, frame = cap.read()
                if not ret:
                    print("Failed to read frame. Retrying...")
                    await asyncio.sleep(2)
                    break
                start_time = cv2.getTickCount()
                
                await self.model_predict(frame)

                # Calculate processing time
                end_time = cv2.getTickCount()
                processing_time = (end_time - start_time) / cv2.getTickFrequency()

                # Handle the case when the video is read to the end
                if self.source_type == "Local Video":
                    frame_rate = cap.get(cv2.CAP_PROP_FPS)
                    frame_time = 1.0 / frame_rate
                    next_frame_time = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0 + processing_time
                    cap.set(cv2.CAP_PROP_POS_MSEC, next_frame_time * 1000)  # Set the next frame position based on processing time

                    if cap.get(cv2.CAP_PROP_POS_FRAMES) >= cap.get(cv2.CAP_PROP_FRAME_COUNT):
                        print("Reached the end of the video. Stopping...")
                        self.running = False
                        await self.db['sources'].update_one(
                            {'_id': ObjectId(self.source_id)},
                            {'$set': {'status': 'stop'}}
                        )
                        break
                else:
                    await asyncio.sleep(1)  # Default sleep time for camera sources

            cap.release()
            print("Video capture released. Retrying to open video source...")
        print("Prediction loop ended.")
        if self.source_type == "Local Video":
            # Delete the local video file
            try:
                os.remove(self.source)
                print(f"Deleted local video file: {self.source}")
            except Exception as e:
                print(f"Failed to delete local video file: {e}")

    def stop(self):
        # Stop the prediction loop
        self.running = False
        if self.task:
            self.task.cancel()
    
    def preprocess_text(self, text):
        # Preprocess text by removing brackets, normalizing characters, and ignoring spaces
        # Remove text in brackets, normalize special characters, and ignore spaces
        text = re.sub(r'\(.*?\)', '', text).strip()
        text = unicodedata.normalize('NFC', text) 
        text = text.replace(" ", "")
        return text
    
    def find_best_match(self, text):
        # Find the best matching unit for the given text using fuzzy matching
        best_match = None
        highest_score = 0
        preprocessed_text = self.preprocess_text(text)
        for unit in self.units:
            preprocessed_unit = self.preprocess_text(unit)
            ratio = fuzz.ratio(preprocessed_text.lower(), preprocessed_unit.lower())
            length_diff = abs(len(preprocessed_text) - len(preprocessed_unit))
            position_score = fuzz.partial_ratio(preprocessed_text.lower(), preprocessed_unit.lower())
            combined_score = ratio + position_score - length_diff * 10  # Combine ratio and position score, penalize length difference
            if len(preprocessed_text) == len(preprocessed_unit):  # Give higher priority to matches with the same length
                combined_score += 20
            if combined_score > highest_score:
                highest_score = combined_score
                best_match = unit
        return best_match if highest_score > 80 else None, highest_score
    
    async def model_predict(self, image):
        # Perform model prediction on the given image
        try:
            # Preprocess the image
            image = preprocess_image(image)
            # Detect gauge
            gauge_results = self.detect_gauge(image)
            print(f"Gauge Detection Results: {gauge_results}")
            if not gauge_results:
                print("No gauge detected.")
                return None  # No gauge detected

            print("Tracking gauge...")
            # Track gauge
            tracks_ids, tracks_det_classes, tracks_rois = self.track_gauge(image, gauge_results)

            for roi_id, _, roi in zip(tracks_ids, tracks_det_classes, tracks_rois):
                x1, y1, x2, y2 = roi
                x1 = max(0, x1)
                x2 = max(0, x2)
                y1 = max(0, y1)
                y2 = max(0, y2)

                # Crop the image using the bounding box coordinates
                cropped_image = image[y1:y2, x1:x2]

                # Perform OCR
                boxes, txts, scores = self.ocr_model.ocr_det_rec(cropped_image)

                # Check for units in recognized text using fuzzy matching
                unit_detected = None
                highest_score = 0
                for text in txts:
                    best_match, score = self.find_best_match(text)
                    if score > highest_score:
                        highest_score = score
                        unit_detected = best_match

                if roi_id not in self.ocr_results:
                    self.ocr_results[roi_id] = {
                        'boxes': [],
                        'txts': [],
                        'scores': []
                    }

                # Combine new OCR results with previous ones for NMS
                all_boxes = self.ocr_results[roi_id]['boxes'] + boxes
                all_txts = self.ocr_results[roi_id]['txts'] + txts
                all_scores = self.ocr_results[roi_id]['scores'] + scores

                # Convert bounding boxes to NMS-compatible format
                nms_boxes = []
                for box in all_boxes:
                    if len(box) > 0:
                        box_np = np.array(box, dtype=np.int32)  # Ensure the data type is correct
                        rect = cv2.boundingRect(box_np)
                        nms_boxes.append((rect[0], rect[1], rect[2], rect[3]))

                nms_scores = np.array(all_scores, dtype=np.float32)

                # Apply NMS
                indices = cv2.dnn.NMSBoxes(nms_boxes, nms_scores, score_threshold=0.5, nms_threshold=0.1)

                # Initialize filtered results
                filtered_boxes = []
                filtered_txts = []
                filtered_scores = []
                used_indices = set()

                # Safely extract selected indices
                if indices is not None and len(indices) > 0:
                    selected_indices = [i for i in indices]
                    nms_filtered_boxes = [all_boxes[i] for i in selected_indices]
                    nms_filtered_texts = [all_txts[i] for i in selected_indices]
                    nms_filtered_scores = [all_scores[i] for i in selected_indices]
        
                    for i in range(len(nms_filtered_texts)):
                        if i in used_indices:
                            continue
                            
                        current_text = nms_filtered_texts[i].lower()  # Case-insensitive comparison
                        current_score = nms_filtered_scores[i]
                        best_score_idx = i
                        
                        # Compare with remaining texts
                        for j in range(i + 1, len(nms_filtered_texts)):
                            if j in used_indices:
                                continue
                                
                            if current_text == nms_filtered_texts[j].lower():
                                used_indices.add(j)
                                # Keep the one with higher confidence score
                                if nms_filtered_scores[j] > current_score:
                                    best_score_idx = j
                                    current_score = nms_filtered_scores[j]
                        
                        filtered_boxes.append(nms_filtered_boxes[best_score_idx])
                        filtered_txts.append(nms_filtered_texts[best_score_idx])
                        filtered_scores.append(nms_filtered_scores[best_score_idx])
                        used_indices.add(i)

                # Update the OCR results with filtered results
                self.ocr_results[roi_id] = {
                    'boxes': filtered_boxes,
                    'txts': filtered_txts,
                    'scores': filtered_scores
                }
                print(f"Filtered OCR Results: Boxes: {filtered_boxes}, Texts: {filtered_txts}, Scores: {filtered_scores}")

                # Detect base, min, and max
                base_min_max_data = self.base_min_max_model.detection_yolo(cropped_image)
                print(f"Base, Min, Max Detection Results: {base_min_max_data}")
                # Extract base, min, and max coordinates
                base_coord = next(((a[0] + a[2] // 2, a[1] + a[3] // 2) for a, b, c in base_min_max_data if 'base' in c), None)
                min_coord = next(((a[0] + a[2] // 2, a[1] + a[3] // 2) for a, b, c in base_min_max_data if 'minimum' in c), None)
                max_coord = next(((a[0] + a[2] // 2, a[1] + a[3] // 2) for a, b, c in base_min_max_data if 'maximum' in c), None)

                needle_points = {}
                # Needle segmentation
                needle_data = self.needle_segmentation_model.segmentation_needle(remove_shadow_gaussian(cropped_image))

                if needle_data is not None:
                    # Get needle binary mask
                    binary_mask, binary_inv_mask = self.needle_segmentation_model.get_needle_binary_mask(needle_data[0])

                    # Get furthest points from needle segmentation
                    for points in needle_data[1]:
                        distances = {point: np.linalg.norm(np.array(base_coord) - coord) for point, coord in points.items()}
                        furthest_point = max(distances, key=distances.get)
                        needle_points[furthest_point] = points[furthest_point]
                    
                    # Calculate the radius of the gauge
                    radius = max(np.linalg.norm(np.array(base_coord) - np.array(coord)) for coord in needle_points.values())

                    # Get scale mark points
                    scale_mark_points = get_nearest_edges(cropped_image, filtered_boxes, filtered_txts, binary_mask, base_coord, radius)
                else:
                    scale_mark_points = {}

                # Handle missing min and max coordinates
                scale_mark_points_list = list(scale_mark_points.items())  # Convert to list for sorting

                if min_coord is None:
                    potential_min_coords = [p for p in scale_mark_points_list if p[1][0] < base_coord[0]]
                    if potential_min_coords:
                        min_coord = sorted(potential_min_coords, key=lambda p: p[1][1], reverse=True)[0][1]

                if max_coord is None:
                    potential_max_coords = [p for p in scale_mark_points_list if p[1][0] >= base_coord[0]]
                    if potential_max_coords:
                        max_coord = sorted(potential_max_coords, key=lambda p: p[1][1], reverse=True)[0][1]

                if min_coord is None and needle_data:
                    left_points = {point: coord for point, coord in needle_data[1][0].items() if coord[0] < base_coord[0]}
                    if left_points:
                        distances = {point: np.linalg.norm(np.array(base_coord) - coord) for point, coord in left_points.items()}
                        furthest_point = max(distances, key=distances.get)
                        min_coord = left_points[furthest_point]

                if max_coord is None and needle_data:
                    right_points = {point: coord for point, coord in needle_data[1][0].items() if coord[0] >= base_coord[0]}
                    if right_points:
                        distances = {point: np.linalg.norm(np.array(base_coord) - coord) for point, coord in right_points.items()}
                        furthest_point = max(distances, key=distances.get)
                        max_coord = right_points[furthest_point]

                image_height = cropped_image.shape[0]
                # Calculate the threshold in pixels
                pixel_threshold = image_height * 0.05
                print(f"Pixel Threshold: {pixel_threshold}")
                if min_coord is not None and max_coord is not None:
                    if abs(min_coord[1] - max_coord[1]) > pixel_threshold:
                        if min_coord[1] < max_coord[1]:
                            min_coord = (base_coord[0] - (max_coord[0] - base_coord[0]), max_coord[1])
                        else:
                            max_coord = (base_coord[0] + (base_coord[0] - min_coord[0]), min_coord[1])

                if min_coord is None and max_coord is not None:
                    min_coord = (base_coord[0] - (max_coord[0] - base_coord[0]), max_coord[1])

                if max_coord is None and min_coord is not None:
                    max_coord = (base_coord[0] + (base_coord[0] - min_coord[0]), min_coord[1])

                # Calculate central angle
                central_angle = None
                if base_coord is not None and min_coord is not None and max_coord is not None:
                    central_angle = calculate_central_angle(base_coord, min_coord, max_coord)

                # Calculate reading angle
                if needle_data is not None and central_angle is not None:
                    for points in needle_data[1]:
                        distances = {point: np.linalg.norm(np.array(base_coord) - coord) for point, coord in points.items()}
                        furthest_point = max(distances, key=distances.get)
                        reading_angle = calculate_reading_angle(base_coord, min_coord, points[furthest_point], central_angle)
                        if reading_angle > central_angle:
                            reading_angle = 360 - reading_angle
                else:
                    reading_angle = None
                
                print(f"Base Coord: {base_coord}, Min Coord: {min_coord}, Max Coord: {max_coord}")
                print(f"Reading Angle: {reading_angle}")

                # Prepare txt_angle_list for RML
                txt_angle_list = []
                for num, point in scale_mark_points.items():
                    if base_coord is not None and min_coord is not None:
                        angle = calculate_central_angle(base_coord, min_coord, point)
                        txt_angle_list.append((-point[1], num, angle))  # Use negative y-coordinate for reverse sorting

                txt_angle_df = pd.DataFrame({'number': [item[1] for item in txt_angle_list], 'angle': [item[2] for item in txt_angle_list]})
                data = txt_angle_df[['angle', 'number']].values
                print(f"Data for RML: {data}")

                # Run RML to predict the reading
                rml_output = rml.extract_multiple_lines_and_save(data, iterations=30, max_distance=1, min_inliers_allowed=2)
                rml_output_model = rml_output[1]
                predicted_reading = None
                if reading_angle is not None:
                    for model in rml_output_model:
                        predicted_reading = model.predict(np.array(reading_angle))[1]
                        predicted_reading = np.round(predicted_reading, 4)  # Round to 4 significant figures
                        break

                print("predicted_reading:",predicted_reading)
                print("Starting database update thread...")
                await self.update_database(roi_id, predicted_reading, cropped_image, unit_detected)
        except Exception as e:
            print(f"Exception in model_predict: {e}")
            return
    
    async def update_database(self, roi_id, predicted_reading, cropped_image, unit_detected):
        # Update the database with the prediction results and send notifications if needed
        print("Updating database...")
        try:
            timestamp = pd.Timestamp.now().isoformat()
            # Upload cropped image to Dropbox
            print("Preparing upload to Dropbox...")
            try:
                roi_image_link = await self.upload_to_dropbox(cropped_image, f"{self.source_id}_{timestamp}")
            except Exception as e:
                roi_image_link = "https://image-placeholder.com/images/actual-size/640x640.png"
            # Prepare reading data
            reading = {
                'timestamp': timestamp,
                'value': predicted_reading,
                'unit': unit_detected if unit_detected else '',
                'readingImage': roi_image_link
            }
            print("Prepared reading data:", reading)
            
            # Fetch source data from the database
            print("Fetching source data from the database...")
            source = await self.db['sources'].find_one({'_id': ObjectId(self.source_id)})
            if not source:
                raise ValueError(f"Source with ID {self.source_id} not found.")
            
            roi_exists = False
            roi_data = None
            for roi in source.get('rois', []):
                if roi['roi_id'] == roi_id:
                    roi_exists = True
                    roi_data = roi
                    break

            # Determine thresholds and calculate alert status
            alert_status = None
            if roi_exists and 'thresholds' in roi_data:
                print("Checking alert status...")
                thresholds = roi_data['thresholds']
                min_value = thresholds.get('min')
                max_value = thresholds.get('max')
                
                if min_value is not None and predicted_reading < min_value:
                    alert_status = 'low'
                elif max_value is not None and predicted_reading > max_value:
                    alert_status = 'high'
                print(min_value, max_value, predicted_reading, alert_status)
            
            # Update or insert ROI
            if not roi_exists:
                # Insert a new ROI
                print("Inserting new ROI into the database.")
                new_roi = {
                    'roi_id': str(roi_id),
                    'readings': [reading],
                    'roiImage': roi_image_link,
                    'thresholds': {},  # Initialize empty thresholds if not provided
                    'alertHistory': [],  # Initialize empty alert history
                }
                # Add alert history if there is an alert
                if alert_status:
                    new_roi['alertHistory'].append({
                        'timestamp': timestamp,
                        'reading': predicted_reading,
                        'status': alert_status
                    })
                
                await self.db['sources'].update_one(
                    {'_id': ObjectId(self.source_id)},
                    {'$push': {'rois': new_roi}}
                )
            else:
                # Append reading to existing ROI
                print("Appending reading to existing ROI in the database.")
                update_data = {
                    '$push': {'rois.$.readings': reading},
                    '$set': {'rois.$.roiImage': roi_image_link}  # Update ROI image
                }
                
                # Add to alert history if applicable
                if alert_status:
                    update_data['$push']['rois.$.alertHistory'] = {
                        'timestamp': timestamp,
                        'reading': predicted_reading,
                        'status': alert_status
                    }

                await self.db['sources'].update_one(
                    {'_id': ObjectId(self.source_id), 'rois.roi_id': str(roi_id)},
                    update_data
                )
            
            # Check user alert preferences and send notifications if there is an alert
            print("enter alert_status")
            if alert_status is not None:
                print("source:", source)
                alert_users = source.get('alertUsers', [])
                print("alert_users:",alert_users)
                for user_id in alert_users:
                    user = await self.db['users'].find_one({'_id': ObjectId(user_id)})
                    print("user:",user)
                    if user:
                        alert_preferences = user.get('alertPreferences', {})
                        print("alert_preferences:",alert_preferences)
                        if alert_preferences.get('emailNotifications'):
                            email_subject = f"InsightGauge: {source['sourceName']} Alert Notification"
                            email_body = f"""
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Alert Notification</title>
                                <style>
                                    body {{
                                        font-family: Arial, sans-serif;
                                        margin: 0;
                                        padding: 0;
                                        background-color: #f4f4f4;
                                    }}
                                    .email-container {{
                                        max-width: 600px;
                                        margin: 0 auto;
                                        background-color: #ffffff;
                                        padding: 20px;
                                        border-radius: 10px;
                                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                                    }}
                                    .email-header {{
                                        text-align: center;
                                        padding-bottom: 20px;
                                    }}
                                    .email-body {{
                                        padding: 20px;
                                        color: #333333;
                                    }}
                                    .email-footer {{
                                        text-align: center;
                                        color: #888888;
                                        padding-top: 20px;
                                        font-size: 12px;
                                    }}
                                </style>
                            </head>
                            <body>
                                <div class="email-container">
                                    <div class="email-header">
                                        <h2>Alert Notification</h2>
                                    </div>
                                    <div class="email-body">
                                        <p>Hello,</p>
                                        <p>An alert has been triggered for the source <strong>{source['sourceName']}</strong>:</p>
                                        <p>Status: <strong>{alert_status}</strong></p>
                                        <p>Reading: <strong>{predicted_reading}</strong></p>
                                        <p>Timestamp: <strong>{timestamp}</strong></p>
                                        <p>Please check the system for more details.</p>
                                    </div>
                                    <div class="email-footer">
                                        <p>&copy; 2024 InsightGauge. All rights reserved.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                            """
                            await send_email(user['email'], email_subject, email_body)
                        if alert_preferences.get('smsNotifications'):
                            send_sms(user['phone'], f"An alert has been triggered for the source {source['sourceName']}:\nStatus: {alert_status}\nReading: {predicted_reading}\nTimestamp: {timestamp}")

            print("Database update completed.")
        except Exception as e:
            print(f"Exception in update_database: {e}")