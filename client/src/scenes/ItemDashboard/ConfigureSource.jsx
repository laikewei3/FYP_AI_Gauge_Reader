import { Fragment, useEffect, useRef, useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Backdrop, CircularProgress, Typography, Grid, Box, FormControlLabel, Checkbox, Paper, IconButton } from '@mui/material';
import { useTheme } from '@emotion/react';
import Draggable, { DraggableCore } from 'react-draggable';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CustomTextField from '@/components/CustomTextField';

const ConfigureDialog = ({ user, open, handleClose, sourceId }) => {
    const initialData = {
        needleMask: [
            { x: 70, y: 70 },
            { x: 80, y: 90 },
            { x: 90, y: 110 },
            { x: 100, y: 130 }
        ],
        ocrBox: [
            [[[50, 50], [100, 50], [100, 100], [50, 100]], 'text'],
            [[[150, 150], [200, 150], [200, 200], [150, 200]], 'text2']
        ],
        scaleMarkPoint: [{ x: 100, y: 100 }, { x: 30, y: 150 }],
        baseBox: { x: 0, y: 0, width: 50, height: 50 },
        minBox: { x: 200, y: 150, width: 50, height: 50 },
        maxBox: { x: 200, y: 250, width: 50, height: 50 }
    };

    useEffect(() => {
        const fetchROIs = async () => {
          try {
            const response = await fetch(`http://127.0.0.1:8000/source/${sourceId}/rois`);
            if (!response.ok) {
              throw new Error('Failed to fetch ROIs');
            }
            const data = await response.json();
            const rois = data.rois;
            setRois(transformROIs(rois));
            setData(rois[0]);
            setImageSrc(rois[0].roiImage);
          } catch (error) {
            console.error(error);
          }
        };
    
        if (sourceId) {
          fetchROIs();
        }
      }, [sourceId]);

    const [data, setData] = useState({});
    const [rois, setRois] = useState([]);
    const [focusedPoint, setFocusedPoint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progressStep, setProgressStep] = useState(0);
    const progressTexts = ['Uploading...', 'Processing...', 'Saving...'];

    const { palette } = useTheme();
    const [currentRoiIndex, setCurrentRoiIndex] = useState(0);
    const [checkboxState, setCheckboxState] = useState({
        needleMask: false,
        ocrBox: false,
        scaleMarkPoint: false,
        baseBox: false,
        minBox: false,
        maxBox: false
    });
    const [editState, setEditState] = useState({
        needleMask: false,
        ocrBox: false,
        scaleMarkPoint: false,
        baseBox: false,
        minBox: false,
        maxBox: false
    });
    const imageRef = useRef(null);
    const [imageDimensions, setImageDimensions] = useState({});
    const [originalDimensions, setOriginalDimensions] = useState({});
    const [imageSrc, setImageSrc] = useState('');
    const [scaleX, setScaleX] = useState(1);
    const [scaleY, setScaleY] = useState(1);

    const transformROIs = (rois) => {
        return rois.map(roi => {
            const { gaugeData, roiImage } = roi;
            const { gauge_properties, ocr_data, base_min_max_data, needle_data, scale_mark_angles } = gaugeData;

            // Function to generate a bounding box of size 50x50 from a center point
            const generateBBox = (center) => {
                const size = 50;
                const halfSize = size / 2;
                return {
                    x: center[0] - halfSize,
                    y: center[1] - halfSize,
                    width: size,
                    height: size
                };
            };
    
            return {
                needleMask: needle_data.needle_segmentation.map(point => ({ x: point[0], y: point[1] })),
                ocrBox: ocr_data.boxes.map((box, index) => [box, ocr_data.texts[index]]),
                scaleMarkPoint: scale_mark_angles.scale_mark_points.map(point => ({ x: point[0], y: point[1] })),
                baseBox: generateBBox(base_min_max_data.base_coord),
                minBox: generateBBox(base_min_max_data.min_coord),
                maxBox: generateBBox(base_min_max_data.max_coord)
            };
        });
    };

    const handleCheckboxChange = (event) => {
        setCheckboxState({ ...checkboxState, [event.target.name]: event.target.checked });
    };
    const handleNextPage = () => {
        setCurrentRoiIndex((prevIndex) => {
            const newIndex = prevIndex + 1;
            setData(rois[newIndex]);
            setImageSrc(rois[newIndex].roiImage);
            return newIndex;
        });
    };
    const handlePreviousPage = () => {
        setCurrentRoiIndex((prevIndex) => {
            const newIndex = prevIndex - 1;
            setData(rois[newIndex]);
            setImageSrc(rois[newIndex].roiImage);
            return newIndex;
        });
    };

    const handleEditClick = (event) => {
        const { name } = event.currentTarget;
        setEditState({
            ...editState,
            [name]: !editState[name]
        });
        setCheckboxState({ ...checkboxState, [name]: true });
    };

    const handleDrag = (type, index, e, ui, pointIndex = null) => {
        setData((prevData) => {
            const newData = { ...prevData };
            if (type === 'needleMask') {
                // Check if dragging a single point
                if (pointIndex !== null) {
                    // Update only the specified point
                    const updatedPoint = {
                        x: newData[type][pointIndex].x + ui.deltaX / scaleX,
                        y: newData[type][pointIndex].y + ui.deltaY / scaleY,
                    };

                    // Ensure updated point stays within bounds
                    if (
                        updatedPoint.x >= 0 && updatedPoint.x <= originalDimensions.width &&
                        updatedPoint.y >= 0 && updatedPoint.y <= originalDimensions.height
                    ) {
                        newData[type][pointIndex] = updatedPoint;
                    }
                } else {
                    // Drag entire polygon
                    const newPoints = newData[type].map((point) => ({
                        x: point.x + ui.deltaX / scaleX,
                        y: point.y + ui.deltaY / scaleY,
                    }));

                    const isOutOfBounds = newPoints.some(point =>
                        point.x < 0 || point.x > originalDimensions.width ||
                        point.y < 0 || point.y > originalDimensions.height
                    );

                    if (!isOutOfBounds) {
                        newData[type] = newPoints;
                    }
                }
            } else if (type === 'ocrBox') {
                // Check if dragging a single point
                if (pointIndex !== null) {
                    // Update only the specified point
                    const updatedPoint = {
                        x: newData[type][index][0][pointIndex][0] + ui.deltaX / scaleX,
                        y: newData[type][index][0][pointIndex][1] + ui.deltaY / scaleY,
                    };

                    // Ensure updated point stays within bounds
                    if (
                        updatedPoint.x >= 0 && updatedPoint.x <= originalDimensions.width &&
                        updatedPoint.y >= 0 && updatedPoint.y <= originalDimensions.height
                    ) {
                        newData[type][index][0][pointIndex] = [updatedPoint.x, updatedPoint.y];
                    }
                } else {
                    // Drag entire polygon
                    const deltaX = ui.deltaX / scaleX;
                    const deltaY = ui.deltaY / scaleY;
                    const newPoints = newData[type][index][0].map((point) => [
                        point[0] + deltaX,
                        point[1] + deltaY,
                    ]);

                    const isOutOfBounds = newPoints.some(point =>
                        point[0] < 0 || point[0] > originalDimensions.width ||
                        point[1] < 0 || point[1] > originalDimensions.height
                    );

                    if (!isOutOfBounds) {
                        newData[type][index][0] = newPoints;
                    }
                }
            } else if (type === 'scaleMarkPoint') {
                const newPoint = {
                    x: newData.scaleMarkPoint[index].x + ui.deltaX / scaleX,
                    y: newData.scaleMarkPoint[index].y + ui.deltaY / scaleY,
                };
                if (newPoint.x >= 0 && newPoint.x <= originalDimensions.width &&
                    newPoint.y >= 0 && newPoint.y <= originalDimensions.height) {
                    newData.scaleMarkPoint[index] = newPoint;
                }
            } else {
                const width = newData[type].width || 0;
                const height = newData[type].height || 0;
                newData[type].x = Math.max(0, Math.min(newData[type].x + ui.deltaX / scaleX, originalDimensions.width - width));
                newData[type].y = Math.max(0, Math.min(newData[type].y + ui.deltaY / scaleY, originalDimensions.height - height));
            }
            return newData;
        });
    };


    const handleDeletePoint = (type, index) => {
        setData((prevData) => {
            const newData = { ...prevData };
            if (Array.isArray(newData[type])) {
                newData[type] = newData[type].filter((_, idx) => idx !== index);
            } else if (type === 'ocrBox') {
                newData.ocrBox = newData.ocrBox.map((box, idx) =>
                    idx === index ? box.slice(0, box.length - 1) : box
                );
            }
            return newData;
        });
    };

    const handleAddPoint = (type) => {
        setData((prevData) => {
            const newData = { ...prevData };
            const newPoint = { x: 0, y: 0 }; // Default coordinates for new points (adjust as needed)

            if (Array.isArray(newData[type])) {
                newData[type] = [...newData[type], newPoint];
            } else if (type === 'ocrBox') {
                newData.ocrBox = newData.ocrBox.map((box) => [...box, newPoint]);
            }
            return newData;
        });
    };

    const updateImageDimensions = () => {
        if (imageRef.current) {
            const { width, height } = imageRef.current.getBoundingClientRect();
            setImageDimensions({ "width": width, "height": height });
        }
    };

    const handleImageLoad = () => {
        if (imageRef.current) {
            setOriginalDimensions({
                "width": imageRef.current.naturalWidth,
                "height": imageRef.current.naturalHeight,
            });
            updateImageDimensions();
        }
    };

    const renderCenterPoint = (box) => {
        const centerX = (box.width / 2) * scaleX;
        const centerY = (box.height / 2) * scaleY;
        return (
            <Box
                sx={{
                    position: 'absolute',
                    left: centerX - 5, // Adjust to center the box
                    top: centerY - 5, // Adjust to center the box
                    width: 10,
                    height: 10,
                    backgroundColor: 'blue',
                    borderRadius: '50%',
                    cursor: 'default'
                }}
            />
        );
    };
    // Updates the text for a specific ocrBox
    const handleTextChange = (type, boxIndex, newText) => {
        setData(prevData => {
            const updatedData = { ...prevData };
            updatedData[type][boxIndex][1] = newText; // Update the text in the specified ocrBox
            return updatedData;
        });
    };

    // Adds a new OCR box with 4 default points and empty text
    const handleAddOCRBox = () => {
        setData(prevData => {
            const updatedData = { ...prevData };
            const newBox = [
                [ // Default coordinates (you can adjust these initial values)
                    [10, 10],
                    [60, 10],
                    [60, 60],
                    [10, 60],
                ],
                '' // Empty text field
            ];
            updatedData.ocrBox = [...updatedData.ocrBox, newBox]; // Add the new box to the ocrBox array
            return updatedData;
        });
    };

    // Deletes an OCR box at a specified index
    const handleDeleteBox = (type, boxIndex) => {
        setData(prevData => {
            const updatedData = { ...prevData };
            updatedData[type] = updatedData[type].filter((_, idx) => idx !== boxIndex); // Remove the box at boxIndex
            return updatedData;
        });
    };


    useEffect(() => {
        updateImageDimensions();
        window.addEventListener('resize', updateImageDimensions);
        return () => window.removeEventListener('resize', updateImageDimensions);
    }, []);

    useEffect(() => {
        setScaleX(imageDimensions.width / originalDimensions.width);
        setScaleY(imageDimensions.height / originalDimensions.height);
    }, [imageDimensions]);

    const checkboxes = ['needleMask', 'ocrBox', 'scaleMarkPoint', 'baseBox', 'minBox', 'maxBox'];
    const half = Math.ceil(checkboxes.length / 2);

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" sx={{ '& .MuiDialog-paper': { width: '80%', minHeight: '80%', } }}>
            <DialogTitle fontSize="20px" sx={{ backgroundColor: 'background.default', color: palette.grey.main }}>
                Configure Source
            </DialogTitle>
            <DialogContent
                sx={{
                    backgroundColor: 'background.default',
                    padding: '20px',
                }}
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                        {/* ROI Image */}
                        <Paper
                            sx={{
                                backgroundColor: 'background.default',
                                width: { xs: '100%', md: 'auto' },
                                borderColor: 'transparent',
                                boxShadow: 'none',
                                maxWidth: { md: '100%' },
                                height: 'auto',
                                position: 'relative',
                            }}
                        >
                            <img
                                ref={imageRef}
                                src={imageSrc}
                                alt="ROI"
                                onLoad={handleImageLoad}
                                style={{ width: '100%', height: 'auto' }}
                            />
                            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                {checkboxState.needleMask && (
                                    <svg
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                    >
                                        <Draggable
                                            disabled={!editState.needleMask}
                                            onDrag={(e, ui) => handleDrag('needleMask', 0, e, ui)}
                                            position={{ x: 0, y: 0 }}
                                        >
                                            <polygon
                                                points={data.needleMask.map(point => `${point.x * scaleX},${point.y * scaleY}`).join(' ')}
                                                style={{
                                                    fill: 'none',
                                                    stroke: 'red',
                                                    strokeWidth: 2,
                                                    cursor: editState.needleMask ? 'grab' : 'default'
                                                }}
                                            />

                                        </Draggable>
                                        {data.needleMask.map((point, index) => (
                                            <Draggable
                                                key={index}
                                                disabled={!editState.needleMask}
                                                onDrag={(e, ui) => handleDrag('needleMask', index, e, ui, index)}
                                                position={{ x: point.x * scaleX, y: point.y * scaleY }}
                                                onStart={() => setFocusedPoint(index)}
                                                onStop={() => setFocusedPoint(null)}
                                            >
                                                <circle
                                                    cx={0}
                                                    cy={0}
                                                    r={5}
                                                    fill="red"
                                                    style={{ cursor: focusedPoint === index ? 'grab' : 'move' }}
                                                />
                                            </Draggable>

                                        ))}
                                    </svg>
                                )}
                                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                    {checkboxState.ocrBox &&
                                        data.ocrBox.map((box, index) => {
                                            const points = box[0];
                                            const text = box[1];

                                            return (
                                                <Fragment key={index}>
                                                    <Draggable
                                                        disabled={!editState.ocrBox}
                                                        onDrag={(e, ui) => handleDrag('ocrBox', index, e, ui)}
                                                        position={{ x: 0, y: 0 }}
                                                    >
                                                        <polygon
                                                            points={points.map(point => `${point[0] * scaleX},${point[1] * scaleY}`).join(' ')}
                                                            style={{
                                                                fill: 'transparent',
                                                                stroke: 'blue',
                                                                strokeWidth: 2,
                                                                cursor: editState.ocrBox ? 'grab' : 'default'
                                                            }}
                                                        />
                                                    </Draggable>
                                                    {points.map((point, pointIndex) => (
                                                        <Draggable
                                                            disabled={!editState.ocrBox}
                                                            key={pointIndex}
                                                            onDrag={(e, ui) => handleDrag('ocrBox', index, e, ui, pointIndex)}
                                                            position={{
                                                                x: point[0] * scaleX,
                                                                y: point[1] * scaleY,
                                                            }}
                                                            onStart={() => setFocusedPoint(pointIndex)}
                                                            onStop={() => setFocusedPoint(null)}
                                                        >
                                                            <circle
                                                                cx={0}
                                                                cy={0}
                                                                r={5}
                                                                fill="blue"
                                                                style={{
                                                                    cursor: editState.ocrBox
                                                                        ? focusedPoint === pointIndex
                                                                            ? 'grab'
                                                                            : 'move'
                                                                        : 'default',  // Set cursor to default in non-editState
                                                                }}
                                                            />
                                                        </Draggable>
                                                    ))}
                                                    <text
                                                        x={points[0][0] * scaleX}
                                                        y={points[0][1] * scaleY}
                                                        fill="blue"
                                                    >
                                                        {text}
                                                    </text>
                                                </Fragment>
                                            );
                                        })}
                                </svg>
                                {checkboxState.scaleMarkPoint && data.scaleMarkPoint.map((point, index) => (
                                    <Draggable
                                        key={index}
                                        onDrag={(e, ui) => handleDrag('scaleMarkPoint', index, e, ui)}
                                        position={{ x: point.x * scaleX, y: point.y * scaleY }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                width: 10 * scaleX,
                                                height: 10 * scaleY,
                                                borderRadius: '50%',
                                                border: '2px solid blue',
                                                cursor: editState.scaleMarkPoint ? 'move' : 'default'
                                            }}
                                        />
                                    </Draggable>
                                ))}
                                {checkboxState.baseBox && (
                                    <Draggable
                                        disabled={!editState.baseBox}
                                        onDrag={(e, ui) => handleDrag('baseBox', 0, e, ui)}
                                        position={{ x: data.baseBox.x * scaleX, y: data.baseBox.y * scaleY }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                width: data.baseBox.width * scaleX,
                                                height: data.baseBox.height * scaleY,
                                                border: '2px solid green',
                                                cursor: editState.baseBox ? 'move' : 'default'
                                            }}
                                        >
                                            {renderCenterPoint(data.baseBox)}
                                        </Box>
                                    </Draggable>
                                )}
                                {checkboxState.minBox && (
                                    <Draggable
                                        disabled={!editState.minBox}
                                        onDrag={(e, ui) => handleDrag('minBox', 0, e, ui)}
                                        position={{ x: data.minBox.x * scaleX, y: data.minBox.y * scaleY }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                width: data.minBox.width * scaleX,
                                                height: data.minBox.height * scaleY,
                                                border: '2px solid purple',
                                                cursor: editState.minBox ? 'move' : 'default'
                                            }}
                                        >
                                            {renderCenterPoint(data.minBox)}
                                        </Box>
                                    </Draggable>
                                )}
                                {checkboxState.maxBox && (
                                    <Draggable
                                        disabled={!editState.maxBox}
                                        onDrag={(e, ui) => handleDrag('maxBox', 0, e, ui)}
                                        position={{ x: data.maxBox.x * scaleX, y: data.maxBox.y * scaleY }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                width: data.maxBox.width * scaleX,
                                                height: data.maxBox.height * scaleY,
                                                border: '2px solid orange',
                                                cursor: editState.maxBox ? 'move' : 'default'
                                            }}
                                        >
                                            {renderCenterPoint(data.maxBox)}
                                        </Box>
                                    </Draggable>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {/* Checkboxes */}
                        <Box sx={{ display: 'flex' }}>
                            <Box>
                                {checkboxes.slice(0, half).map((key) => (
                                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }} key={key}>
                                        <FormControlLabel
                                            control={<Checkbox name={key} checked={checkboxState[key]} onChange={handleCheckboxChange} sx={{ color: palette.grey[500], '&.Mui-checked': { color: palette.primary.main } }} />}
                                            label={<Typography sx={{ color: palette.grey[500] }}>{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>}
                                        />
                                        {key !== 'needleMask' && (  // Hide the edit button for needleMask
                                            <IconButton
                                                name={key}
                                                onClick={handleEditClick}
                                                color={editState[key] ? "secondary" : "primary"}
                                                aria-label={`edit ${key}`}
                                                disabled={Object.values(editState).some((state) => state) && !editState[key]}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                            <Box>
                                {checkboxes.slice(half).map((key) => (
                                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }} key={key}>
                                        <FormControlLabel
                                            control={<Checkbox name={key} checked={checkboxState[key]} onChange={handleCheckboxChange} sx={{ color: palette.grey[500], '&.Mui-checked': { color: palette.primary.main } }} />}
                                            label={<Typography sx={{ color: palette.grey[500] }}>{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>}
                                        />
                                        <IconButton
                                            name={key}
                                            onClick={handleEditClick}
                                            color={editState[key] ? "secondary" : "primary"}
                                            aria-label={`edit ${key}`}
                                            disabled={Object.values(editState).some((state) => state) && !editState[key]}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        {/* Coordinates display and edit controls */}
                        {Object.keys(data).map((type) => (
                            (type === 'scaleMarkPoint' || type === 'needleMask') && editState[type] && (
                                <Box key={type}>
                                    <Typography variant="h4">Point List</Typography>
                                    <Box
                                        key={type}
                                        sx={{
                                            mt: 2,
                                            maxHeight: '10rem',
                                            overflowY: 'auto',
                                        }}
                                    >
                                        <Grid container spacing={1}>
                                            {data[type].map((point, idx) => (
                                                <Grid item xs={6} sm={4} key={`${type}-${idx}`} sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Typography variant="body2" color="grey.500">
                                                        ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                                                    </Typography>
                                                    <IconButton
                                                        onClick={() => handleDeletePoint(type, idx)}
                                                        aria-label={`delete point ${idx}`}
                                                        color="secondary"
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={() => handleAddPoint(type)}
                                        color="primary"
                                        variant="outlined"
                                        sx={{ marginBottom: '8px', marginTop: '8px' }}
                                    >
                                        Add Point
                                    </Button>
                                </Box>
                            )
                        ))}
                        {Object.keys(data).map((type) => (
                            type === 'ocrBox' && editState[type] && (
                                <Box key={type}>
                                    <Typography variant="h4">OCR Box List</Typography>
                                    <Box
                                        sx={{
                                            mt: 2,
                                            maxHeight: '10rem',
                                            overflowY: 'auto',
                                        }}
                                    >
                                        {data[type].map((box, idx) => (
                                            <Box key={`${type}-${idx}`} sx={{ mb: 2 }}>
                                                <Typography variant="h6">Box {idx + 1}</Typography>

                                                <Grid container spacing={1}>
                                                    {box[0].map((point, pointIndex) => (
                                                        <Grid item xs={6} key={`${type}-${idx}-point-${pointIndex}`}>
                                                            <Typography variant="body2" color="grey.500">
                                                                Point {pointIndex + 1}: ({point[0].toFixed(1)}, {point[1].toFixed(1)})
                                                            </Typography>
                                                        </Grid>
                                                    ))}
                                                </Grid>

                                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                    <CustomTextField
                                                        label="Text"
                                                        value={box[1]}
                                                        sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
                                                        onChange={(e) => handleTextChange(type, idx, e.target.value)}
                                                        variant="outlined"
                                                        size="small"
                                                    />
                                                    <IconButton
                                                        onClick={() => handleDeleteBox(type, idx)}
                                                        aria-label={`delete ocrBox ${idx}`}
                                                        color="error"
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={() => handleAddOCRBox()}
                                        color="primary"
                                        variant="outlined"
                                        sx={{ marginBottom: '8px', marginTop: '8px' }}
                                    >
                                        Add OCR Box
                                    </Button>
                                </Box>
                            )
                        ))}


                        {/* Graph */}
                        <Box>
                            <Typography variant="h6" sx={{ color: palette.grey[500] }}>Graph Title</Typography>
                            <Box sx={{ width: '100%', height: '200px', backgroundColor: 'grey.200' }}>
                                {/* Placeholder for graph */}
                                Graph goes here
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <Button onClick={handlePreviousPage} variant="contained" color="primary" disabled={currentRoiIndex === 0} >
                        Previous
                    </Button>
                    <Button onClick={handleNextPage} variant="contained" color="primary" disabled={currentRoiIndex === rois.length - 1}>
                        Next
                    </Button>
                </Box>
            </DialogContent>

            <DialogActions sx={{ backgroundColor: 'background.default' }}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" color="primary">
                    {/* onClick={handleNext} */}
                    Save
                </Button>
            </DialogActions>
            <Backdrop open={loading} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <div style={{ textAlign: 'center' }}>
                    <CircularProgress color="secondary" />
                    <Typography variant="h6" color="secondary" sx={{ marginTop: '10px' }}>
                        {progressTexts[progressStep]}
                    </Typography>
                </div>
            </Backdrop>
        </Dialog >
    );
};

export default ConfigureDialog;