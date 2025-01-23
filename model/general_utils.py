import math
import cv2
import numpy as np
from model.retinex import msrcp


def isNumber(str):
    try:
        num = float(str)
        return True, num
    except ValueError:
        return False, str

def calculate_central_angle(center, point1, point2):
    vector1 = np.array([point1[0] - center[0], point1[1] - center[1]])
    vector2 = np.array([point2[0] - center[0], point2[1] - center[1]])
    
    # Normalize vectors
    vector1_norm = vector1 / np.linalg.norm(vector1)
    vector2_norm = vector2 / np.linalg.norm(vector2)
    
    # Calculate angle using dot product
    dot_product = np.clip(np.dot(vector1_norm, vector2_norm), -1.0, 1.0)
    angle = np.arccos(dot_product)
    # Calculate the cross product to determine the direction of the angle
    cross_product = np.cross(vector1_norm, vector2_norm)
    
    # If the cross product is negative, the angle is greater than 180 degrees
    if cross_product < 0:
        angle = 2 * np.pi - angle
    
    angle_degrees = np.degrees(angle)
    
    return angle_degrees

def calculate_reading_angle(center, point1, point2, central_angle):
    vector1 = np.array([point1[0] - center[0], point1[1] - center[1]])
    vector2 = np.array([point2[0] - center[0], point2[1] - center[1]])
    
    # Normalize vectors
    vector1_norm = vector1 / np.linalg.norm(vector1)
    vector2_norm = vector2 / np.linalg.norm(vector2)
    
    # Calculate angle using dot product
    dot_product = np.clip(np.dot(vector1_norm, vector2_norm), -1.0, 1.0)
    angle = np.arccos(dot_product)
    # Calculate the cross product to determine the direction of the angle
    cross_product = np.cross(vector1_norm, vector2_norm)
    
    # If the cross product is negative, the angle is greater than 180 degrees
    if cross_product < 0:
        angle = 2 * np.pi - angle
    
    angle_degrees = np.degrees(angle)
    
    # Check if the needle point is lower than the min_coord
    if angle_degrees > central_angle and point2[1] > point1[1]:
        angle_degrees = angle_degrees - 360
    
    return angle_degrees

def resize_image(image, target_size):
    h, w = image.shape[:2]
    aspect = w / h

    # Calculate the scaling factors for width and height
    scale_w = target_size / w
    scale_h = target_size / h

    # Resize the image while maintaining the aspect ratio
    if aspect > 1:
        new_w = target_size
        new_h = int(h * scale_w)
    else:
        new_w = int(w * scale_h)
        new_h = target_size

    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

# =============================================================================
def mask_needle(image, needle_mask, boxes):
    # Create a mask for the OCR text
    for bbox in boxes:
        cv2.fillPoly(image, np.int32([np.array(bbox)]), 255)
    
    # Mask the needle by white color
    needle_indices = np.where(needle_mask == 0)
    image[needle_indices] = 255
    
    return image

def find_nearest_edges(bbox, scale_mark_points, threshold=80):
    # Calculate the center and corners of the bbox
    center = (int((bbox[0][0] + bbox[2][0]) // 2), int((bbox[0][1] + bbox[2][1]) // 2))
    corners = [bbox[0], bbox[1], bbox[2], bbox[3]]
    
    # Calculate the average distance of each point to the bbox
    point_avg_distances = {}
    for point in scale_mark_points:
        point_tuple = tuple(point)  # Convert list to tuple
        total_dist = sum(np.linalg.norm(np.array(point) - np.array(corner)) for corner in corners)
        avg_dist = total_dist / len(corners)
        point_avg_distances[point_tuple] = avg_dist
    
    # Check if all average distances are greater than the threshold (50)
    if all(avg_dist > threshold for avg_dist in point_avg_distances.values()):
        print(f"All average distances are greater than {threshold}. Returning center {center}")
        return center
    
    # Select the point with the smallest average distance to all corners
    best_point = min(point_avg_distances, key=point_avg_distances.get)
    return best_point

def get_nearest_edges(image, bboxes, texts, needle_mask, base_coord, radius):
    # Convert the segmented image to grayscale and apply thresholding
    gray_segmented = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresholded = cv2.threshold(gray_segmented, 0, 255, cv2.THRESH_OTSU)
    masked_image = mask_needle(thresholded, needle_mask, bboxes)
    # cv2.imshow("Masked Image "+str(base_coord), masked_image)

    points = find_scale_points(masked_image, base_coord[0], base_coord[1], radius)
    # for point in points:
    #     cv2.circle(image, point, 3, (0, 255, 0), -1)  # Green for scale marks
    scale_mark_points = {}
    for bbox, text in zip(bboxes, texts):
        isNum, res = isNumber(text)
        if isNum:
            (cx, cy) = find_nearest_edges(bbox, points)
            scale_mark_points[res] = (cx, cy)
    
    return dict(sorted(scale_mark_points.items()))

def merge_nearby_points(points, min_distance=5):
    merged_points = []
    for point in points:
        if not merged_points:
            merged_points.append(point)
        else:
            for i, merged_point in enumerate(merged_points):
                if np.linalg.norm(np.array(point) - np.array(merged_point)) < min_distance:
                    merged_points[i] = tuple(np.mean([point, merged_point], axis=0).astype(int))
                    break
            else:
                merged_points.append(point)
    return merged_points

def find_scale_points(thresholded, center_x, center_y, radius):
    # Apply erosion and dilation
    kernel = np.ones((3, 3), np.uint8)
    thresholded = cv2.erode(thresholded, kernel, iterations=2)
    # cv2.imshow("Thresholded "+str(center_x)+","+str(center_y), thresholded)

    # Find contours in the thresholded image
    contours, _ = cv2.findContours(thresholded, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # Filter contours near the gauge circle
    scale_mark_points = []
    for contour in contours:
        for point in contour:
            x, y = point[0]
            distance_to_circle = abs(math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2) - radius)
            if distance_to_circle < 10:  # Adjust tolerance for points near the circumference
                scale_mark_points.append((x, y))

    # Merge nearby points
    scale_mark_points = merge_nearby_points(scale_mark_points)
    scale_mark_points = constrain_points_to_circle(scale_mark_points, center_x, center_y, radius)

    return scale_mark_points

def constrain_points_to_circle(scale_mark_points, center_x, center_y, radius):
    constrained_points = []

    for x, y in scale_mark_points:
        # Calculate the angle of the point relative to the center
        angle = math.atan2(y - center_y, x - center_x)

        # Project the point onto the circle
        constrained_x = int(center_x + radius * math.cos(angle))
        constrained_y = int(center_y + radius * math.sin(angle))

        # Add the constrained point to the list
        constrained_points.append((constrained_x, constrained_y))

    return constrained_points
# ==================================================================================
def remove_shadow_gaussian(image):
    # Convert to LAB to work on the lightness channel only
    lab = cv2.cvtColor(image.copy(), cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    # Use a large Gaussian blur to estimate the illumination across the image
    illumination = cv2.GaussianBlur(l, (99,99), 0)

    # Divide the L channel by the illumination estimate to correct shadows
    shadow_removed = cv2.divide(l, illumination, scale=255)

    # Merge back with original color channels and convert back to BGR
    shadow_removed_lab = cv2.merge((shadow_removed, a, b))
    shadow_removed_bgr = cv2.cvtColor(shadow_removed_lab, cv2.COLOR_LAB2BGR)
    return shadow_removed_bgr

def adjust_brightness(image, min_brightness=70, max_brightness=180):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)

    if brightness < min_brightness:
        ratio = min_brightness / brightness
        adjusted_img = cv2.convertScaleAbs(image, alpha=ratio, beta=0)
    elif brightness > max_brightness:
        ratio = max_brightness / brightness
        adjusted_img = cv2.convertScaleAbs(image, alpha=ratio, beta=0)
    else:
        adjusted_img = image

    return adjusted_img

def apply_clahe(image):
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l)
    lab_enhanced = cv2.merge((l_enhanced, a, b))
    enhanced_image = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)
    return enhanced_image

def sharpen_image(roi):
    if roi.size == 0:
        return roi
    blurred = cv2.GaussianBlur(roi, (0, 0), 3)
    return cv2.addWeighted(roi, 1.5, blurred, -0.5, 0)

def detect_haze(image, threshold=0.2):
    dark_channel = calculate_dark_channel(image)
    avg_dark_intensity = np.mean(dark_channel) / 255.0
    return avg_dark_intensity > threshold

def calculate_dark_channel(image, patch_size=15):
    min_channel = cv2.min(cv2.min(image[:, :, 0], image[:, :, 1]), image[:, :, 2])
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (patch_size, patch_size))
    dark_channel = cv2.erode(min_channel, kernel)
    return dark_channel

def dehaze(image):
    return msrcp(image)  # Ensure msrcp is defined in your context

def adjust_gamma(image, gamma=1.0):
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(256)]).astype("uint8")
    return cv2.LUT(image, table)

def preprocess_image(image):
    if detect_haze(image):
        image = dehaze(image)
    gamma = 1.2
    image = adjust_gamma(image, gamma)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)
    if brightness < 70 or brightness > 180:
        image = adjust_brightness(image)
    image = apply_clahe(image)
    image = sharpen_image(image)
    return image