import { useState } from "react";
import { useTheme } from "@emotion/react";
import PropTypes from "prop-types";
import DashboardBox from "@/components/DashboardBox";
import { Modal, Box, Button, Typography, List, ListItem, TextField, IconButton } from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import RefreshIcon from '@mui/icons-material/Refresh';

const Row4 = ({ readings }) => {
    const { palette } = useTheme();
    const [showReadings, setShowReadings] = useState(false);
    const [showImage, setShowImage] = useState(false);
    const [imageSrc, setImageSrc] = useState("");
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const handleShowReadings = () => setShowReadings(true);
    const handleCloseReadings = () => setShowReadings(false);

    const handleShowImage = (src) => {
        setImageSrc(src);
        setShowImage(true);
    };
    const handleCloseImage = () => setShowImage(false);

    const handleResetDates = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const filteredReadings = readings.filter((reading) => {
        const readingDate = new Date(reading.timestamp);
        if (startDate && readingDate < startDate) return false;
        if (endDate && readingDate > endDate) return false;
        return true;
    });

    return (
        <>
            <DashboardBox gridArea="f" onClick={handleShowReadings} sx={{ cursor: 'pointer', textAlign: 'center', padding: 2, color: 'white', borderRadius: 2 }}>
                Click to see the Readings History
            </DashboardBox>

            <Modal open={showReadings} onClose={handleCloseReadings}>
                <Box sx={{ p: 4, boxShadow: 24, borderRadius: 2, maxWidth: 600, mx: 'auto', mt: '10%', textAlign: 'center', bgcolor: 'background.default', maxHeight: '70vh', overflowY: 'auto' }}>
                    <Typography variant="h6" component="h3" fontSize="20px" sx={{ mb: 2 }}>
                        Readings History
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <DateTimePicker
                                label="Start Date"
                                value={startDate}
                                onChange={(newValue) => setStartDate(newValue)}
                                slotProps={{
                                    textField: {
                                        InputLabelProps: { style: { color: palette.grey[300] } },
                                        InputProps: { style: { color: palette.grey[300] } },
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': {
                                                    borderColor: palette.grey[300],
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: palette.grey[100],
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: palette.main,
                                                },
                                            },
                                            '& .MuiInputBase-input': {
                                                backgroundColor: palette.background.default,
                                                color: palette.grey[300],
                                            },
                                            '& .MuiSvgIcon-root': {
                                                color: palette.grey[300],
                                            },
                                        }
                                    },
                                    popper: {
                                        sx: {
                                            '& .MuiPaper-root': {
                                                backgroundColor: palette.background.default,
                                                color: palette.grey[300],
                                            },
                                            '& .MuiPickersDay-root': {
                                                color: palette.grey[300],
                                                '&:hover': {
                                                    backgroundColor: palette.action.hover,
                                                },
                                                '&.Mui-selected': {
                                                    backgroundColor: palette.primary.main,
                                                    color: palette.grey[900],
                                                },
                                            },
                                            '& .MuiClock-pin': {
                                                backgroundColor: palette.primary.main,
                                            },
                                            '& .MuiClockPointer-root': {
                                                backgroundColor: palette.primary.main,
                                            },
                                            '& .MuiClockPointer-thumb': {
                                                backgroundColor: palette.primary.main,
                                                borderColor: palette.primary.main,
                                            },
                                            '& .MuiPickersLayout-root': {
                                                backgroundColor: palette.background.default,
                                                color: palette.grey[300],
                                            },
                                            '& .MuiPickersLayout-actionBar button': {
                                                color: palette.grey[300],
                                            },
                                            '& .MuiClock-clock': {
                                                backgroundColor: palette.background.default,
                                            },
                                            '& .MuiClockNumber-root': {
                                                color: palette.grey[300],
                                            },
                                            '& .MuiSvgIcon-root': {
                                                color: palette.grey[300],
                                            },
                                            '& .MuiTypography-root': {
                                                color: palette.grey[500],
                                            },
                                            '& button.MuiButtonBase-root.MuiButtonBase-root.MuiButton-text': {
                                                color: palette.primary.main,
                                            },
                                        },
                                    },
                                }}
                            />
                            <Box sx={{ width: 16 }} /> {/* Add space between the DateTimePickers */}
                            <DateTimePicker
                                label="End Date"
                                value={endDate}
                                onChange={(newValue) => setEndDate(newValue)}
                                slotProps={{
                                    textField: {
                                        InputLabelProps: { style: { color: palette.grey[300] } },
                                        InputProps: { style: { color: palette.grey[300] } },
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': {
                                                    borderColor: palette.grey[300],
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: palette.grey[100],
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: palette.main,
                                                },
                                            },
                                            '& .MuiInputBase-input': {
                                                backgroundColor: palette.background.default,
                                                color: palette.grey[300],
                                            },
                                            '& .MuiSvgIcon-root': {
                                                color: palette.grey[300],
                                            },
                                        }
                                    },
                                    popper: {
                                        sx: {
                                            '& .MuiPaper-root': {
                                                backgroundColor: palette.background.default,
                                                color: palette.grey[300],
                                            },
                                            '& .MuiPickersDay-root': {
                                                color: palette.grey[300],
                                                '&:hover': {
                                                    backgroundColor: palette.action.hover,
                                                },
                                                '&.Mui-selected': {
                                                    backgroundColor: palette.primary.main,
                                                    color: palette.grey[900],
                                                },
                                            },
                                            '& .MuiClock-pin': {
                                                backgroundColor: palette.primary.main,
                                            },
                                            '& .MuiClockPointer-root': {
                                                backgroundColor: palette.primary.main,
                                            },
                                            '& .MuiClockPointer-thumb': {
                                                backgroundColor: palette.primary.main,
                                                borderColor: palette.primary.main,
                                            },
                                            '& .MuiPickersLayout-root': {
                                                backgroundColor: palette.background.default,
                                                color: palette.grey[300],
                                            },
                                            '& .MuiPickersLayout-actionBar button': {
                                                color: palette.grey[300],
                                            },
                                            '& .MuiClock-clock': {
                                                backgroundColor: palette.background.default,
                                            },
                                            '& .MuiClockNumber-root': {
                                                color: palette.grey[300],
                                            },
                                            '& .MuiSvgIcon-root': {
                                                color: palette.grey[300],
                                            },
                                            '& .MuiTypography-root': {
                                                color: palette.grey[500],
                                            },
                                            '& button.MuiButtonBase-root.MuiButtonBase-root.MuiButton-text': {
                                                color: palette.primary.main,
                                            },
                                        },
                                    },
                                }}
                            />
                            <IconButton onClick={handleResetDates} sx={{ color: palette.grey[300], ml: 2 }}>
                                <RefreshIcon />
                            </IconButton>
                        </Box>
                    </LocalizationProvider>
                    <List sx={{ pb: 8 }}>
                        {filteredReadings.map((reading, index) => (
                            <ListItem key={index} sx={{ display: 'block', mb: 2, borderBottom: '1px solid #ddd', pb: 2 }}>
                                <Typography color={palette.grey[300]}>Timestamp: {reading.timestamp}</Typography>
                                <Typography color={palette.grey[300]}>Value: {reading.value} {reading.unit}</Typography>
                                <Button variant="outlined" onClick={() => handleShowImage(reading.readingImage)} sx={{ mt: 1 }}>
                                    View Image
                                </Button>
                            </ListItem>
                        ))}
                    </List>
                    <Box sx={{ position: 'sticky', bottom: -35, bgcolor: 'background.default', pt: 2, pb: 2 }}>
                        <Button variant="contained" onClick={handleCloseReadings}>
                            Close
                        </Button>
                    </Box>
                </Box>
            </Modal>

            <Modal open={showImage} onClose={handleCloseImage}>
                <Box sx={{ p: 2, boxShadow: 24, borderRadius: 2, maxWidth: 400, mx: 'auto', mt: '20%', textAlign: 'center', bgcolor: 'background.default', maxHeight: '80vh', overflowY: 'auto' }}>
                    <Typography variant="h6" component="h3" fontSize="20px" sx={{ mb: 2 }}>
                        Reading Image
                    </Typography>
                    <img src={imageSrc} alt="Reading" style={{ width: "100%", borderRadius: 8 }} />
                    <Button variant="contained" onClick={handleCloseImage} sx={{ mt: 2 }}>
                        Close
                    </Button>
                </Box>
            </Modal>
        </>
    );
};

Row4.propTypes = {
    readings: PropTypes.arrayOf(
        PropTypes.shape({
            timestamp: PropTypes.string.isRequired,
            value: PropTypes.number.isRequired,
            unit: PropTypes.string.isRequired,
            readingImage: PropTypes.string.isRequired,
        })
    ).isRequired,
};

export default Row4;