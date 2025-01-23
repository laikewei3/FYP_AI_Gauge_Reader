import { useEffect, useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Box, Backdrop, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@emotion/react';
import SearchableSelect from '@/components/SearchableSelect';
import CustomTextField from '@/components/CustomTextField';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';


const AddSourceDialog = ({ user, userId, companyId, open, handleClose, setSources }) => {
    const { palette } = useTheme();
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [sourceType, setSourceType] = useState('');
    const [sourceName, setSourceName] = useState('');
    const [belongType, setBelongType] = useState('');
    const [sourcePath, setSourcePath] = useState('');
    const [visibleDepartments, setVisibleDepartments] = useState([]);
    const [departmentOptions, setDepartmentOptions] = useState([]);
    const [errors, setErrors] = useState({});
    const [sourceVerification, setSourceVerification] = useState(null);
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [loading, setLoading] = useState(false);
    const [progressStep, setProgressStep] = useState(0);
    const [successMessage, setSuccessMessage] = useState('');
    const [isConfigureDialogOpen, setIsConfigureDialogOpen] = useState(false);
    const [accountType, setAccountType] = useState('');
    const progressTexts = [
        "Step 1: Initializing...",
        "Step 2: Processing Data...",
        "Step 3: Uploading Files...",
        "Step 4: Finalizing..."];

    async function requestCameraAccess() {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'camera' });

            if (permissionStatus.state === 'granted') {
                console.log("Camera permission already granted.");
            } else if (permissionStatus.state === 'denied') {
                console.log("Camera permission denied.");
            } else {
                await navigator.mediaDevices.getUserMedia({ video: true });
                console.log("Camera and audio permissions granted.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // Function to get available video devices
    async function getVideoDevices() {
        try {
            await requestCameraAccess(); // Ensure permissions are requested first
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            let devicesOptions = []
            videoDevices.forEach((device) => {
                console.log(`${device.kind}, ${device.label} id = ${device.deviceId}`);
                devicesOptions.push({
                    "label": device.label,
                    "value": device.deviceId
                });
            });
            setVideoDevices(devicesOptions);
            return videoDevices; // Return video devices for further use
        } catch (error) {
            console.error("Error enumerating devices:", error);
        }
    }

    const handleCameraSelection = (e, getTagProps) => {
        // you can get the index of the option selected from the event target
        const optionIndex = e.target.dataset.optionIndex;
        // setCompany(getTagProps);
        setSourcePath(optionIndex);
    };

    useEffect(() => {
        console.log("User ID:", userId);
        getVideoDevices(); // Fetch video devices on component mount
    }, []);

    useEffect(() => {
        async function fetchData() {
            if (belongType === "Department") {
                // const response = await fetch(`http://127.0.0.1:8000/company_departments/${companyId}`);
                const response = await fetch(`http://127.0.0.1:8000/user_departments/${userId}`);
                if (!response.ok) {
                    throw new Error('Failed to get departments');
                }

                // Parse department response
                const department_data = await response.json();
                const transformedDepartmentOptions = department_data.map(department => ({
                    label: department.name,
                    value: department.departmentId
                }));
                console.log("Department Options:", transformedDepartmentOptions);
                // Set department options
                setDepartmentOptions(transformedDepartmentOptions);
            }
        }
        fetchData();
        console.log("VisibleDepartments:", visibleDepartments);
    }, [userId, belongType]);

    useEffect(() => {
        async function fetchAccountType() {
            try {
                const response = await fetch(`http://127.0.0.1:8000/account_type/${userId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch user account type');
                }
                const userData = await response.json();
                setAccountType(userData.accountType);
            } catch (error) {
                console.error("Error fetching user account type:", error);
            }
        }
        fetchAccountType();
    }, [userId]);

    const handleSourceVerification = async () => {
        setSourceVerification(null); // Reset status to loading

        try {
            let isValid = false;

            // Check the source type
            isValid = await checkSource(sourcePath);

            // Set verification result based on the validity check
            setSourceVerification(isValid);
        } catch (error) {
            console.error("Error verifying source:", error);
            setSourceVerification(false); // Assume false if there's an error
        }
    };

    const checkSource = async (sourcePath) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/validate-source', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sourcePath })
            });

            // Check if the response is OK
            if (!response.ok) {
                console.error("Error connecting to Source:", response.statusText);
                return false;
            }

            // Read the response text
            const responseText = await response.text();

            // Parse the response text as JSON
            const result = responseText ? JSON.parse(responseText) : {};

            return result.valid;
        } catch (error) {
            console.error("Error connecting to Source:", error);
            return false;
        }
    };

    // Function to reset state variables
    const resetState = () => {
        setSourceName('');
        setSourceType('');
        setBelongType('');
        setSourcePath('');
        setVisibleDepartments([]);
        setErrors({});
    };

    // Wrapped handleClose to reset state first and then call the passed handleClose
    const wrappedHandleClose = () => {
        resetState(); // Reset the state
        handleClose(); // Call the original handleClose passed from the parent component
    };

    const handleNext = async (e) => {
        const isValid = validateForm();
        if (isValid) {
            try {
                setLoading(true);
                setProgressStep(0);

                if (sourceType !== "Local Video") {
                    const sourceValid = await checkSource(sourcePath);
                    if (!sourceValid) {
                        console.error("Invalid source path:", sourcePath);
                        setLoading(false);
                        return;
                    }
                }

                // Step 1: Create initial source entry in the database
                const initialSourceData = {
                    sourceName: sourceName,
                    sourceType: sourceType,
                    megaFile: selectedFile?.name.split('.').pop() || null,
                    belongType: belongType,
                    belongId: belongType === "Personal" ? userId : companyId,
                    sourcePath: sourcePath,
                    rois: [],
                    visibleToDepartments: visibleDepartments,
                };

                const initialResponse = await fetch("http://127.0.0.1:8000/add-source/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(initialSourceData),
                });

                const initialData = await initialResponse.json();
                if (!initialResponse.ok) {
                    throw new Error(initialData.detail);
                }

                const sourceId = initialData.source_id; // Retrieve the sourceId
                console.log("sourceId:", sourceId);
                let finalSourcePath = sourcePath;

                // Step 2: Upload file to Mega if sourceType is 'Local Video'
                if (sourceType === "Local Video" && selectedFile) {
                    try {
                        setProgressStep(1);
                        const formData = new FormData();
                        formData.append("file", selectedFile, sourceId + "." + selectedFile?.name.split('.').pop()); // Use sourceId as file name for uniqueness
                        formData.append("username", user);

                        const megaUploadResponse = await fetch("http://127.0.0.1:8000/upload-to-mega/", {
                            method: "POST",
                            body: formData,
                        });

                        const megaResult = await megaUploadResponse.json();
                        if (megaUploadResponse.ok && megaResult.fileLocation) {
                            finalSourcePath = megaResult.fileLocation.toString(); // Get the Mega download link
                        } else {
                            console.error("Failed to upload to Mega:", megaResult.detail);
                            await fetch(`http://127.0.0.1:8000/delete-source/${sourceId}`, {
                                method: 'DELETE',
                            });
                            setLoading(false);
                            return;
                        }
                        setProgressStep(2);
                        // Step 3: Update the sourcePath in the database with the Mega download link
                        const updateResponse = await fetch(`http://127.0.0.1:8000/update_source_path/`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ source_id: sourceId, source_path: finalSourcePath }),
                        });

                        if (!updateResponse.ok) {
                            throw new Error("Failed to update source with Mega link.");
                        }
                        setProgressStep(3);
                    } catch (error) {
                        console.error("Error uploading file to Mega:", error);
                        await fetch(`http://127.0.0.1:8000/delete-source/${sourceId}`, {
                            method: 'DELETE',
                        });
                        setLoading(false);
                        setSuccessMessage(
                            <Dialog open={true} onClose={() => {
                                setSuccessMessage('');
                            }}>
                                <DialogContent sx={{
                                    backgroundColor: 'background.default',
                                    padding: '20px'
                                }}>
                                    <Typography variant="h5" color={palette.grey[300]}>
                                        Source added failed.
                                    </Typography>
                                </DialogContent>
                                <DialogActions sx={{ backgroundColor: 'background.default' }}>
                                    <Button onClick={() => { setSuccessMessage(''); }} variant="contained" color="secondary">
                                        OK
                                    </Button>
                                </DialogActions>
                            </Dialog>
                        );
                        return;
                    }
                }
                // Initialize the Reader class
                const create_reader_response = await fetch('http://127.0.0.1:8000/create_reader/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        source_id: sourceId,
                        source_type: sourceType,
                        source_path: sourceType === "Local Video" ? finalSourcePath : sourcePath,
                        user: userId,
                    })
                });
            
                if (!create_reader_response.ok) {
                    throw new Error(`Request failed with status ${create_reader_response.status}`);
                }

                // Add the new source to the UI state
                const newSource = { ...initialSourceData, sourceId, sourcePath: sourcePath };
                setSources((prevSources) => [...prevSources, newSource]);

                const timeoutId = setTimeout(() => {
                    handleSuccessClose();
                    navigate(`/${user}/Dashboard/${sourceId}`);
                }, 3000);

                const handleOkClick = () => {
                    clearTimeout(timeoutId);
                    handleSuccessClose();
                    navigate(`/${user}/Dashboard/${sourceId}`);
                };

                setSuccessMessage(
                    <Dialog open={true} onClose={(handleSuccessClose)}>
                        <DialogContent sx={{
                            backgroundColor: 'background.default',
                            padding: '20px'
                        }}>
                            <Typography variant="h5" color={palette.grey[300]}>
                                Source added successfully.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ backgroundColor: 'background.default' }}>
                            <Button onClick={handleOkClick} variant="contained" color="primary">
                                OK
                            </Button>
                        </DialogActions>
                    </Dialog>
                );

                handleClose();
                setLoading(false);
            } catch (error) {
                console.error("Error adding new source:", error);
                setSuccessMessage(
                    <Dialog open={true} onClose={() => {
                        setSuccessMessage('');
                    }}>
                        <DialogContent sx={{
                            backgroundColor: 'background.default',
                            padding: '20px'
                        }}>
                            <Typography variant="h5" color={palette.grey[300]}>
                                Source added failed. Please try again.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ backgroundColor: 'background.default' }}>
                            <Button onClick={() => { setSuccessMessage(''); }} variant="contained" color="secondary">
                                OK
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
                setLoading(false);
            }
        } else {
            console.log("Error");
        }
    };

    const handleSuccessClose = () => {
        setSuccessMessage('');
    };

    const handleConfigureDialogClose = () => {
        setIsConfigureDialogOpen(false);
    };

    const validateForm = () => {
        let newErrors = {}
        if (!sourceName)
            newErrors.sourceName = "Source Name is required."

        if (!sourceType)
            newErrors.sourceType = "Source Type is required."

        if (!belongType)
            newErrors.belongType = "Belong Type is required."

        if (!sourcePath)
            newErrors.sourcePath = "Source Path is required."

        if (belongType === "Department" && visibleDepartments.length == 0)
            newErrors.visibleDepartments = "Visible Department(s) is required."

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleVideoUpload = (e) => {
        const file = e.target.files[0]; // Get the first (and only) selected file
        if (file && file.type.startsWith('video/')) {
            setSelectedFile(file);
            setSourcePath(file.name); // Set the video path
        } else {
            console.error("Please select a valid video file.");
        }
    };

    const belongTypeOptions = accountType === "personal" 
    ? [{ label: "Personal" }] 
    : [{ label: "Personal" }, { label: "Company" }, { label: "Department" }];

    return (
        <>
            <Dialog open={open} onClose={wrappedHandleClose} maxWidth="sm" fullWidth>
                <DialogTitle fontSize="20px" sx={{ backgroundColor: 'background.default', color: palette.grey.main }}>
                    Add New Source
                </DialogTitle>
                <DialogContent
                    sx={{
                        backgroundColor: 'background.default',
                        padding: '20px'
                    }}
                >
                    <CustomTextField
                        label="Source Name"
                        fullWidth
                        margin="normal"
                        value={sourceName}
                        error={!!errors.sourceName}
                        helperText={errors.sourceName}
                        InputLabelProps={{ style: { color: palette.grey[500] } }}
                        sx={{ input: { color: palette.grey[300] } }}
                        onChange={(e) => {
                            setSourceName(e.target.value);
                        }}
                    />

                    {/* Source Type Dropdown */}
                    <SearchableSelect
                        onInputChange={(e, newValue) => { setSourceType(newValue); setSelectedFile(null); setSourcePath('') }}
                        options={[
                            { label: "IP Camera / URL", value: "IP Camera" },
                            { label: "Device Camera", value: "Device Camera" },
                            { label: "Local Video", value: "Local Video" }]}
                        placeholder={"Source Type"}
                        label="Source Type"
                        InputLabelProps={{ style: { color: palette.grey[500] } }}
                        sx={{ input: { color: palette.grey[300] } }}
                        margin="normal"
                        fullWidth
                        value={sourceType}
                        error={!!errors.sourceType}
                        helperText={errors.sourceType}
                    />

                    {/* URL Text Field (Optional) */}
                    <Box>
                        {sourceType === "Device Camera" ? (
                            <SearchableSelect
                                onInputChange={(e, newValue) => handleCameraSelection(e, newValue)} // Set the selected camera
                                options={videoDevices} // Array of device cameras
                                placeholder={"Select Device Camera"}
                                label="Device Camera"
                                InputLabelProps={{ style: { color: palette.grey[500] } }}
                                sx={{ input: { color: palette.grey[300] } }}
                                margin="normal"
                                fullWidth
                                error={!!errors.sourcePath}
                                helperText={errors.sourcePath}
                            />
                        ) : (
                            <CustomTextField
                                label="Source Path"
                                fullWidth
                                margin="normal"
                                value={sourcePath}
                                error={!!errors.sourcePath}
                                helperText={errors.sourcePath}
                                InputLabelProps={{ style: { color: palette.grey[500] } }}
                                sx={{
                                    input: { color: palette.grey[300] },
                                    "& .MuiInputBase-root.Mui-disabled": {
                                        "& > fieldset": {
                                            borderColor: palette.grey[700]
                                        }
                                    }
                                }}
                                onChange={(e) => {
                                    setSourcePath(e.target.value);
                                    setSelectedFile(null);
                                }}
                                disabled={sourceType == "Local Video"}
                            />
                        )}

                        {sourceType === "Local Video" ? (
                            <>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    sx={{ marginRight: "10px" }}
                                    onClick={() => document.getElementById("folderUpload").click()}
                                >
                                    <FileUploadIcon />
                                </Button>
                                <input
                                    type="file"
                                    id="folderUpload"
                                    accept="video/*" // Restrict to only video files
                                    style={{ display: 'none' }} // Hide the input element
                                    onChange={(e) => handleVideoUpload(e)} // Folder upload handler
                                    multiple={false} // Allow only one file to be selected
                                />
                            </>
                        ) : (
                            <Button
                                variant="contained"
                                color={sourceVerification === true ? "primary" : sourceVerification === false ? "secondary" : "grey"}
                                sx={{ marginRight: "10px" }}
                                onClick={handleSourceVerification}
                            >
                                Test source status
                                {sourceVerification === true ? (
                                    <VerifiedUserIcon sx={{ marginLeft: "5px" }} />
                                ) : sourceVerification === false ? (
                                    <CancelIcon sx={{ marginLeft: "5px" }} />
                                ) : <></>}
                            </Button>
                        )}

                    </Box>
                    <hr />
                    {/* Belong Type Dropdown */}
                    <SearchableSelect
                        onInputChange={(e, newValue) => setBelongType(newValue)}
                        options={belongTypeOptions}
                        placeholder={"Belong Type"}
                        label="Belong Type"
                        InputLabelProps={{ style: { color: palette.grey[500] } }}
                        sx={{ input: { color: palette.grey[300] } }}
                        margin="normal"
                        fullWidth
                        value={belongType}
                        error={!!errors.belongType}
                        helperText={errors.belongType}
                    />

                    {/* Visible Departments Text Field (Optional) */}
                    {belongType === "Department" && (
                        <SearchableSelect
                            multiple
                            onChange={(event, newValue) => {
                                setVisibleDepartments(newValue.map(option => option.value));
                            }}
                            options={departmentOptions}
                            placeholder={"Select Departments"}
                            label="Visible Departments"
                            isMulti  // Enable multiple selections
                            InputLabelProps={{ style: { color: palette.grey[500] } }}
                            sx={{ input: { color: palette.grey[300] } }}
                            margin="normal"
                            fullWidth
                            value={visibleDepartments}
                            error={!!errors.visibleDepartments}
                            helperText={errors.visibleDepartments ? errors.visibleDepartments : "Select one or more departments that can access this source"}
                        />
                    )}

                </DialogContent>
                <DialogActions sx={{ backgroundColor: 'background.default' }}>
                    <Button onClick={wrappedHandleClose}>Cancel</Button>
                    <Button onClick={handleNext} variant="contained" color="primary">
                        Next
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
            {successMessage && successMessage}
            <Dialog open={isConfigureDialogOpen} onClose={handleConfigureDialogClose}>
                <DialogContent>
                    <Typography variant="h6">Configure your new source</Typography>
                </DialogContent>
            </Dialog>
        </>
    );
};

AddSourceDialog.propTypes = {
    user: PropTypes.string.isRequired,
    userId: PropTypes.string.isRequired,
    companyId: PropTypes.string.isRequired,
    open: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    setSources: PropTypes.func.isRequired,
};

export default AddSourceDialog;