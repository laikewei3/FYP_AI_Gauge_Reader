import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import DashboardBox from "@/components/DashboardBox";
import { useTheme } from "@emotion/react";
import {
    Grid,
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    TablePagination,
    Paper,
} from "@mui/material";
import CustomTextField from "@/components/CustomTextField";

const Row3 = ({ rois, sourceId, selectedRoiIndex }) => {
    const { palette } = useTheme();
    const [roi, setRoi] = useState(rois ? [selectedRoiIndex] : {});
    const [newThresholds, setNewThresholds] = useState({});
    const [thresholds, setThresholds] = useState({});
    const [isEditing, setIsEditing] = useState(false); // Toggle between editing and saving
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Reset to the first page
    };

    const [alerts, setAlerts] = useState(
        roi?.alerts || []
    );

    const handleThresholdChange = (e) => {
        const { name, value } = e.target;
        setNewThresholds((prev) => ({ ...prev, [name]: parseFloat(value) }));
    };

    const handleUpdateThresholds = async () => {
        if (roi) {
            // Make API call to update the database
            try {
                console.log("Updating thresholds in the database...,", newThresholds);
                const response = await fetch(`http://127.0.0.1:8000/update_thresholds/${sourceId}/${roi.roi_id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(newThresholds),
                });

                const data = await response.json();
                if (response.ok) {
                    console.log("Thresholds updated in the database:", data);
                } else {
                    console.error("Error updating thresholds:", data);
                }
                setThresholds(newThresholds);
                setIsEditing(false);
            } catch (error) {
                console.error("Error updating thresholds:", error);
            }
        }
    };
    // Toggle between edit and save modes
    const toggleEdit = () => {
        setIsEditing(!isEditing);
    };

    useEffect(() => {
        if (rois && rois[selectedRoiIndex]) {
            setRoi(rois[selectedRoiIndex]);
            setThresholds(rois[selectedRoiIndex].thresholds || {});
            const alertHistory = rois[selectedRoiIndex]?.alert_history;
            if (alertHistory) {
                // console.log("Alert history:", alertHistory);
                setAlerts(
                    alertHistory.map((alert) => ({
                        timestamp: new Date(alert.timestamp).toLocaleString(),
                        value: alert.reading,
                        alertMessage:
                            alert.status === "low"
                                ? `Value ${alert.reading} is below the minimum threshold!`
                                : `Value ${alert.reading} is higher than the maximum threshold!`,
                    }))
                );
            } else {
                setAlerts([]); // Set an empty array if alert_history is undefined
            }
        }
    }, [rois, selectedRoiIndex]);

    return (
        <>
            {/* Thresholds Section */}
            <DashboardBox gridArea="d">
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                    Set Thresholds
                </Typography>
                <Box sx={{ borderBottom: '1px solid', mb: 2, color: palette.grey[500] }}></Box>

                <Box display="flex" flexDirection="column" gap={2}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={4}>
                            <Typography sx={{ color: palette.grey[500] }}>Min Threshold:</Typography>
                        </Grid>
                        <Grid item xs={8}>
                            <CustomTextField
                                InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                sx={{ input: { color: palette.grey[300] } }}
                                type="number"
                                name="min"
                                value={isEditing ? newThresholds.min : (thresholds.min ?? '')}
                                onChange={handleThresholdChange}
                                disabled={!isEditing}
                                variant="outlined"
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={4}>
                            <Typography sx={{ color: palette.grey[500] }}>Max Threshold:</Typography>
                        </Grid>
                        <Grid item xs={8}>
                            <CustomTextField
                                InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                sx={{ input: { color: palette.grey[300] } }}
                                type="number"
                                name="max"
                                value={isEditing ? newThresholds.max : (thresholds.max ?? '')}
                                onChange={handleThresholdChange}
                                disabled={!isEditing}
                                variant="outlined"
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                    <Button
                        onClick={isEditing ? handleUpdateThresholds : toggleEdit}
                        variant="outlined"
                        color={isEditing ? "secondary" : "primary"}
                    >
                        {isEditing ? "Save" : "Edit"}
                    </Button>
                </Box>
            </DashboardBox>
            {/* Alerts Section */}
            <DashboardBox gridArea="e">
                <Typography variant="h3" fontWeight="bold" marginBottom="15px" gutterBottom>
                    Alert Log
                </Typography>
                <TableContainer>
                    <Table sx={{ borderCollapse: 'collapse', borderTop: '2px solid' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell><Typography fontWeight="bold" color={palette.grey[500]}>Timestamp</Typography></TableCell>
                                <TableCell><Typography fontWeight="bold" color={palette.grey[500]}>Value</Typography></TableCell>
                                <TableCell><Typography fontWeight="bold" color={palette.grey[500]}>Alert Message</Typography></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {alerts.length > 0 ? (
                                alerts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((alert, index) => (
                                    <TableRow key={index}>
                                        <TableCell sx={{ padding: '12px', color: palette.grey[500], border: '1px solid', borderColor: palette.grey[800], borderLeft: 'none' }}>
                                            {alert.timestamp.split(', ').map((line, index) => (
                                                <div key={index}>{line}</div> // Render each part in a new line
                                            ))}
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px', color: palette.grey[500], border: '1px solid', borderColor: palette.grey[800] }}>{alert.value}</TableCell>
                                        <TableCell sx={{ padding: '12px', color: palette.grey[500], border: '1px solid', borderColor: palette.grey[800], borderRight: 'none' }}>{alert.alertMessage}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Typography sx={{ color: palette.grey[500] }}>No alerts at the moment.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5]}
                    component="div"
                    count={alerts.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                        '& .MuiTablePagination-selectRoot': {
                            color: palette.grey[500], // Text color for rows per page
                        },
                        '& .MuiTablePagination-toolbar': {
                            color: palette.grey[500], // Text color for toolbar
                        },
                        '& .MuiTablePagination-displayedRows': {
                            color: palette.grey[500], // Text color for displayed rows
                        },
                    }}
                />
            </DashboardBox>


        </>
    );
};

Row3.propTypes = {
    rois: PropTypes.array,
    sourceId: PropTypes.string,
    selectedRoiIndex: PropTypes.number,
};
export default Row3;