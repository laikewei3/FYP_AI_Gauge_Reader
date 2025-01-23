import numpy as np
from typing import Any, List
from skimage.measure import LineModelND, ransac
from sklearn.preprocessing import MinMaxScaler

min_samples=2 #RANSAC parameter - The minimum number of data points to fit a model to.

class RansacLineInfo(object):
    """Helper class to manage the information about the RANSAC line."""
    def __init__(self, inlier_points:np.ndarray, model:LineModelND):
        self.inliers=inlier_points #the inliers that were detected by RANSAC algo
        self.model=model    #The LinearModelND that was a result of RANSAC algo

    @property
    def unitvector(self):
        """The unitvector of the model. This is an array of 2 elements (x,y)"""
        return self.model.params[1]

def extract_first_ransac_line(data_points:[], max_distance:int):
    """
    Accepts a numpy array with shape N,2  N points, with coordinates x=[0],y=[1]
    Returns 
         A numpy array with shape (N,2), these are the inliers of the just discovered ransac line
         All data points with the inliers removed
         The model line
    """
    # Calculate the median absolute deviation (MAD) to set a robust max_distance
    residuals = np.abs(data_points - np.median(data_points, axis=0))
    mad = np.median(residuals)
    adjusted_max_distance = max_distance / mad

    model_robust, inliers = ransac(data_points, LineModelND, min_samples=min_samples,
                                   residual_threshold=adjusted_max_distance, max_trials=1000)
    if inliers is None:
        print("RANSAC failed to find a model. Returning None.")
        return None, None, None

    results_inliers=[]
    results_inliers_removed=[]
    for i in range(0,len(data_points)):
        if (inliers[i] == False):
            #Not an inlier
            results_inliers_removed.append(data_points[i])
            continue
        x=data_points[i][0]
        y=data_points[i][1]
        results_inliers.append((x,y))
    return np.array(results_inliers), np.array(results_inliers_removed),model_robust

def generate_plottable_points_along_line(model:LineModelND, xmin:int,xmax:int, ymin:int, ymax:int):
    """
    Computes points along the specified line model
    The visual range is 
    between xmin and xmax along X axis
        and
    between ymin and ymax along Y axis
    return shape is [[x1,y1],[x2,y2]]
    """
    unit_vector=model.params[1]
    slope=abs(unit_vector[1]/unit_vector[0])
    x_values=None
    y_values=None
    if (slope > 1):
        y_values=np.arange(ymin, ymax,1)
        x_values=model.predict_x(y_values)
    else:        
        x_values=np.arange(xmin, xmax,1)
        y_values=model.predict_y(x_values)

    np_data_points=np.column_stack((x_values,y_values)) 
    return np_data_points

def superimpose_all_inliers(ransac_lines):
    """
    Create an RGB image array with dimension heightXwidth
    Draw the points with various colours
    Return the array
    """
    output = []
    output_model = []
    for line_index in range(0,len(ransac_lines)):
        ransac_lineinfo:RansacLineInfo=ransac_lines[line_index]
        inliers=ransac_lineinfo.inliers 
        if inliers is None:
            print(f"Inliers are None for line index {line_index}. Skipping this line.")
            continue
        y_min=inliers[:,1].min()
        y_max=inliers[:,1].max()
        x_min=inliers[:,0].min()
        x_max=inliers[:,0].max()
        output.append(generate_plottable_points_along_line(ransac_lineinfo.model, xmin=x_min,xmax=x_max, ymin=y_min,ymax=y_max))
        output_model.append(ransac_lineinfo.model)
    return [output, output_model]

def calculate_angle_between_lines(model1: LineModelND, model2: LineModelND) -> float:
    """
    Calculate the angle between two line models in degrees.
    """
    vector1 = model1.params[1]
    vector2 = model2.params[1]
    unit_vector_1 = vector1 / np.linalg.norm(vector1)
    unit_vector_2 = vector2 / np.linalg.norm(vector2)
    dot_product = np.dot(unit_vector_1, unit_vector_2)
    angle = np.arccos(dot_product)
    return np.degrees(angle)

def extract_multiple_lines_and_save(data_points:str,iterations:int, max_distance:int, min_inliers_allowed:int, angle_threshold:float = 10.0):
    """
    min_inliers_allowed - a line is selected only if it has more than this inliers. The search process is halted when this condition is met
    max_distance - This is the RANSAC threshold distance from a line for a point to be classified as inlier
    angle_threshold - The minimum angle difference between lines to consider them as separate lines
    """
    results:List[RansacLineInfo]=[]
    starting_points=data_points
    for index in range(0,iterations):
        initial_max_distance=max_distance
        if (len(starting_points) <= min_samples):
            break
        inlier_points, inliers_removed_from_starting, model = extract_first_ransac_line(starting_points, max_distance=initial_max_distance)
        if inlier_points is None or inliers_removed_from_starting is None:
            print("extract_first_ransac_line returned None. Skipping iteration.")
            continue
        if len(inlier_points) >= min_inliers_allowed:
            if results:
                last_model = results[-1].model
                angle = calculate_angle_between_lines(last_model, model)
                if angle < angle_threshold:
                    print(f"Angle between lines is {angle} degrees, which is less than the threshold of {angle_threshold} degrees. Merging lines.")
                    combined_inliers = np.vstack((results[-1].inliers, inlier_points))
                    combined_model, _ = ransac(combined_inliers, LineModelND, min_samples=len(combined_inliers)//2,
                                               residual_threshold=max_distance, max_trials=1000)
                    results[-1] = RansacLineInfo(combined_inliers, combined_model)
                    starting_points = inliers_removed_from_starting
                    continue
            starting_points = inliers_removed_from_starting
            results.append(RansacLineInfo(inlier_points, model))
    return superimpose_all_inliers(results)