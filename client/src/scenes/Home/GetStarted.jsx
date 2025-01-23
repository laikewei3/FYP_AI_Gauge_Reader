import { useTheme } from '@emotion/react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const GetStarted = () => {
    const navigate = useNavigate();
    const { palette } = useTheme();
    return (
        <Box
            sx={{
                textAlign: 'center',
                py: 8,
                px: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}
        >
            <Typography variant="h2" fontWeight="bold" gutterBottom sx={{color: palette.grey.main }}>
                Getting Started with Gauge Reader
            </Typography>
            <Typography variant="h4" sx={{ mb: 4 }}>
                Follow these simple steps to set up and start monitoring your sensors and gauges.
            </Typography>

            <Box sx={{ maxWidth: '600px', textAlign: 'left', mb: 6 }}>
                <Typography variant="h4" sx={{ mt: 3 }}>
                    1. Add Your First Source
                </Typography>
                <Typography variant="body1" sx={{color: palette.grey.main }}>
                    Begin by adding your first gauge or sensor. This will allow you to start collecting real-time data.
                </Typography>

                <Typography variant="h4" sx={{ mt: 3 }}>
                    2. Customize Your Thresholds
                </Typography>
                <Typography variant="body1" sx={{color: palette.grey.main }}>
                    Set up personalized thresholds to receive alerts when readings fall outside your expected range.
                </Typography>

                <Typography variant="h4" sx={{ mt: 3 }}>
                    3. Monitor Your Data
                </Typography>
                <Typography variant="body1" sx={{color: palette.grey.main }}>
                    Use the dashboard to view live readings, analyze trends, and optimize your processes.
                </Typography>
            </Box>

            <Button variant="contained" size="large" onClick={() => navigate('/Register')}>
                Start Now
            </Button>
        </Box>
    );
};

export default GetStarted;