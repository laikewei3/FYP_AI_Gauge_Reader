import { useTheme } from '@emotion/react';
import { Box, Typography, Grid, Card, CardContent, Collapse, IconButton } from '@mui/material';
import { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RegisterImage from '@/assets/Register.png';
import CRegisterImage from '@/assets/CRegister.png';
import LoginImage from '@/assets/Login.png';
import PAddSource from '@/assets/PAddSource.png';
import CAddSource from '@/assets/CAddSource.png';
import historicalData from '@/assets/historicalData.png';
import TypeSource from '@/assets/TypeSource.png';

const ExploreFeatures = () => {
    const { palette } = useTheme();
    const [expanded, setExpanded] = useState(null);

    const handleExpandClick = (index) => {
        setExpanded(expanded === index ? null : index);
    };

    const features = [
        {
            title: "Real-Time Monitoring",
            description: "Get instant access to live data from your gauges and sensors, helping you stay updated at all times.",
        },
        {
            title: "Custom Threshold Alerts",
            description: "Set personalized thresholds and get notified when values go above or below the specified limits.",
        },
        {
            title: "Data Trends and Analytics",
            description: "Analyze historical data to spot trends, optimize performance, and improve decision-making.",
        },
        {
            title: "Multi-Source Management",
            description: "Manage multiple sources from a single platform, making it easy to track all of your critical data points.",
        }
    ];

    const faqs = [
        {
            question: "Are username and email addresses unique? Can I register multiple accounts with the same email?",
            answer: "Yes, both the username and email must be unique. You’ll need to delete your previous account before registering a new one."
        },
        {
            question: "What types of input can I add to the system?",
            answer: "You can add various types of data sources, including IP Cameras, which include all kind of the url, and RTSP streams. You can also add Device Camera, which the system will automatically detect the camera. Lastly, you can add a video file.",
            image: TypeSource
        },
        {
            question: "Can I access historical data for each gauge?",
            answer: "Absolutely! You can view and analyze historical data for each gauge in the dashboard.",
            image: historicalData
        },
        {
            question: "Is it possible to set multiple alert phone numbers or emails for one account?",
            answer: "Unfortunately, each account can only have one alert phone number or email associated with it."
        },
        {
            question: "What kind of insights can I expect from the dashboard?",
            answer: "The dashboard provides real-time updates, historical trends, and visual analytics for all your connected gauges."
        }
    ];

    return (
        <Box
            sx={{
                py: 8,
                px: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Typography sx={{ color: palette.grey[500] }} variant="h2" fontWeight="bold" gutterBottom>
                Explore Our Features
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, maxWidth: '800px', textAlign: 'center' }}>
                Discover all the tools available within the Gauge Reader Dashboard to help you monitor, manage, and optimize your operations.
            </Typography>

            <Grid container spacing={4}>
                {features.map((feature, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card sx={{ height: '100%', backgroundColor: palette.background.light }}>
                            <CardContent>
                                <Typography variant="h5" fontWeight="bold" gutterBottom>
                                    {feature.title}
                                </Typography>
                                <Typography sx={{ color: palette.grey[500] }} variant="body1">{feature.description}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            {/* Line between sections */}
            <Box sx={{ width: '100%', height: '1px', backgroundColor: palette.grey[300], my: 4 }} />
            <Box sx={{ mt: 4, px: 2 }}>
                {/* Step-by-Step Instructions */}
                <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{ color: palette.grey[500], fontSize: "1.5rem" }}
                >
                    Step-by-Step Instructions
                </Typography>

                {/* Personal Account Instructions */}
                <Typography
                    variant="h6"
                    sx={{ mt: 2, color: palette.grey[500], fontSize: "1.25rem", fontWeight: "medium" }}
                >
                    For Personal Accounts:
                </Typography>
                <Box sx={{ mt: 1, ml: 2 }}>
                    {[
                        { text: "Register a Personal Account: Sign up by providing your details to create a personal account.", image: RegisterImage },
                        { text: "Login to Your Account: Use your registered credentials to securely access the system.", image: LoginImage },
                        { text: "Add a Data Source: Head to the dashboard and add a new data source to begin tracking.", image: PAddSource },
                        { text: "Monitor Results: View real-time insights and detailed gauge data directly on the gauge dashboard." }
                    ].map((step, index) => (
                        <Box key={index} sx={{ mt: 2 }}>
                            <Typography
                                variant="body1"
                                sx={{ color: palette.grey[500], fontSize: "1.25rem" }}
                            >
                                {`${index + 1}. ${step.text}`}
                            </Typography>
                            {step.image && (
                                <img src={step.image} alt={`Step ${index + 1}`} style={{ width: '100%', maxWidth: '600px', height: 'auto', marginTop: '10px' }} />
                            )}
                        </Box>
                    ))}
                </Box>

                {/* Company Account Instructions */}
                <Typography
                    variant="h6"
                    sx={{ mt: 4, color: palette.grey[500], fontSize: "1.25rem", fontWeight: "medium" }}
                >
                    For Company Accounts:
                </Typography>
                <Box sx={{ mt: 1, ml: 2 }}>
                    {[
                        { text: "Register Your Company Account: Create a company profile by entering your organization’s details. The email and username registered will be the company admin automatically.", image: CRegisterImage },
                        { text: "Login to the System: Access your account with your secure company credentials.", image: LoginImage },
                        { text: "Add Data Sources: From the dashboard, integrate new data sources for your organization.", image: CAddSource },
                        { text: "Analyze Results: Access comprehensive gauge data and visualizations in the gauge dashboard." }
                    ].map((step, index) => (
                        <Box key={index} sx={{ mt: 2 }}>
                            <Typography
                                variant="body1"
                                sx={{ color: palette.grey[500], fontSize: "1.25rem" }}
                            >
                                {`${index + 1}. ${step.text}`}
                            </Typography>
                            {step.image && (
                                <img src={step.image} alt={`Company Step ${index + 1}`} style={{ width: '100%', maxWidth: '600px', height: 'auto', marginTop: '10px' }} />
                            )}
                        </Box>
                    ))}
                </Box>

                {/* Divider */}
                <Box sx={{ width: '100%', height: '1px', backgroundColor: palette.grey[300], my: 4 }} />

                {/* FAQ Section */}
                <Typography
                    variant="h2"
                    fontWeight="bold"
                    sx={{ color: palette.grey[500], fontSize: "1.5rem", mb: 2 }}
                >
                    Frequently Asked Questions
                </Typography>
                <Box sx={{ mt: 1 }}>
                    {faqs.map((faq, index) => (
                        <Box key={index} sx={{ mb: 3 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: palette.background.light,
                                    borderRadius: 1,
                                    p: 2,
                                    boxShadow: 1
                                }}
                                onClick={() => handleExpandClick(index)}
                            >
                                <IconButton sx={{ color: palette.grey[500] }}>
                                    {expanded === index ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                                <Typography
                                    variant="body1"
                                    fontWeight="bold"
                                    sx={{ color: palette.grey[500], fontSize: "1.25rem" }}
                                >
                                    {faq.question}
                                </Typography>
                            </Box>
                            <Collapse in={expanded === index}>
                                <Box sx={{ p: 2, backgroundColor: palette.background.default, borderRadius: 1, boxShadow: 1 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ mt: 1, color: palette.grey[500], fontSize: "1.25rem" }}
                                    >
                                        {faq.answer}
                                    </Typography>
                                    {faq.image && (
                                        <img src={faq.image} alt={`FAQ ${index + 1}`} style={{ width: '100%', maxWidth: '600px', height: 'auto', marginTop: '10px' }} />
                                    )}
                                </Box>
                            </Collapse>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default ExploreFeatures;