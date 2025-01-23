import { Box, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import Carousel from 'react-material-ui-carousel';
import { useTheme } from '@emotion/react';
import alertsImage from '@/assets/alerts.jpg'; 
import thresholdImage from '@/assets/threshold.jpg'; 
import monitorImage from '@/assets/monitor.jpg'; 
import { Link } from 'react-router-dom';

const Home = () => {
    const { palette } = useTheme();
    const carouselItems = [
        {
            image: monitorImage,
            title: "Real-Time Monitoring",
            description: "Get instant insights with live data from all your gauges and sensors.",
        },
        {
            image: thresholdImage,
            title: "Custom Threshold Settings",
            description: "Set personalized thresholds and receive alerts for critical readings.",
        },
        {
            image: alertsImage,
            title: "Alerts and Notifications",
            description: "Be instantly notified of any abnormal readings.",
        },
    ];
    return (
        <Box sx={{ flexGrow: 1 }}>
            <Box>
                {/* Hero Section */}
                <Box
                    sx={{
                        color: 'white',
                        textAlign: 'center',
                        py: 6,
                        px: 10,
                    }}
                >
                    <Typography variant="h2" fontWeight="bold" gutterBottom>
                        Monitor, Analyze, and Optimize with Precision
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 4 }}>
                        Our Gauge Reader Dashboard delivers accurate, real-time monitoring of crucial data points.
                    </Typography>
                    <Button component={Link} to="/GetStarted" variant="contained" size="large" sx={{ backgroundColor: 'primary.main' }}>
                        Get Started
                    </Button>
                </Box>
                {/* Carousel Section */}
                <Box sx={{ mt: 1 }}>
                    <Carousel
                        autoPlay={true}
                        animation="slide"
                        indicators={true}
                        cycleNavigation={true}
                        interval={4000}
                        sx={{ width: '100%' }}
                    >
                        {carouselItems.map((item, index) => (
                            <Box
                                key={index}
                                sx={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    height: '65vh',  // Adjust height relative to the viewport
                                    maxHeight: '600px'  // Optional, set a max height
                                }}
                            >
                                {/* Image Section */}
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        top: 0,
                                        left: 0,
                                    }}
                                />

                                {/* Gradient Overlay */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 80%), linear-gradient(to right, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%)', // Fade effect
                                        zIndex: 5,
                                    }}
                                />

                                {/* Text Section */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,  // Align to the bottom of the box
                                        left: 0,
                                        width: '100%',  // Make the box full width
                                        color: 'white',  // Text color
                                        zIndex: 10,
                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Semi-transparent background
                                        padding: '10px 20px',
                                        textAlign: 'center'
                                    }}
                                >
                                    <Typography variant="h5">{item.title}</Typography>
                                    <Typography variant="body1">{item.description}</Typography>
                                </Box>
                            </Box>
                        ))}
                    </Carousel>
                </Box>

                {/* Why It Matters Section */}
                <Box sx={{ mt: 8 }}>
                    <Typography variant="h3" gutterBottom sx={{ textAlign: 'center' }}>
                        Why Choose Our Gauge Reader Dashboard?
                    </Typography>
                    <Grid container spacing={4} sx={{ mt: 4 }}>
                        <Grid item xs={12} md={4}>
                            <Card
                                sx={{
                                    backgroundColor: 'background.light',
                                    color: 'grey.500',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    p: 3
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h4" gutterBottom>
                                        Efficiency
                                    </Typography>
                                    <Typography variant="body1" paddingTop="10px">
                                        Monitor all key gauges in one place, improving your decision-making speed.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card
                                sx={{
                                    backgroundColor: 'background.light',
                                    color: 'grey.500',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    p: 3
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h4" gutterBottom>
                                        Customization
                                    </Typography>
                                    <Typography variant="body1" paddingTop="10px">
                                        Set personalized thresholds for each sensor to match your specific needs.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card
                                sx={{
                                    backgroundColor: 'background.light',
                                    color: 'grey.500',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    p: 3
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h4" gutterBottom>
                                        Insight
                                    </Typography>
                                    <Typography variant="body1" paddingTop="10px">
                                        Analyze trends and optimize performance with detailed data reports.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>


                {/* Call to Action Section */}
                <Box sx={{ mt: 8, textAlign: 'center' }}>
                    <Typography variant="h4" gutterBottom>Experience the Power of Real-Time Monitoring</Typography>
                    <Button component={Link} to="/ExploreFeatures" variant="contained" size="large" sx={{ backgroundColor: 'secondary.main', mt: 2 }}>
                        Explore Features
                    </Button>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ color: palette.grey[700], p: 3, textAlign: 'center' }}>
                <Typography variant="body2">© 2024 Gauge Reader, Inc. All rights reserved.</Typography>
            </Box>
        </Box>
    );
};

export default Home;
