import CustomTextField from "@/components/CustomTextField";
import LoginRegister from "@/components/LoginRegister";
import { Button, Grid, Typography, useTheme } from "@mui/material";
import { useState } from "react";

const ChangePassword = () => {
    const { palette } = useTheme();
    const [user, setUser] = useState('');
    const [message, setMessage] = useState('');

    const handlePasswordResetSubmit = async (e) => {
        e.preventDefault();

        try {
            // Check if the user exists using the GET request
            const userExistResponse = await fetch(`http://127.0.0.1:8000/user_exists_email_username/${user}`);

            if (!userExistResponse.ok) {
                throw new Error('Failed to verify user existence');
            }

            // Parse the response to get the user existence status
            const { user_exists } = await userExistResponse.json();

            // If the user doesn't exist, set a message and stop further execution
            if (!user_exists) {
                setMessage('User not found. Please check your email or username.');
                return;  // Stop the function here
            }

            const response = await fetch('http://127.0.0.1:8000/forgot_password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user }),
            });

            if (!response.ok) {
                throw new Error('Failed to send reset link');
            }

            const result = await response.json();
            setMessage(result.message);
        } catch (error) {
            console.error('Error:', error);
            setMessage('Error sending reset link');
        }
    };

    return (
        <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: '80vh' }}
        >
            <Grid item xs={1}>
                <LoginRegister>
                    <Typography variant="h3" gutterBottom>
                        Forgot Password
                    </Typography>

                    <Typography variant="body1" sx={{ mt: 2 }}>
                        Enter your username and registered email to receive a password reset link.
                    </Typography>
                    <form onSubmit={handlePasswordResetSubmit}>
                        <CustomTextField
                            label="Username / Email"
                            placeholder="Enter username or email"
                            InputLabelProps={{ style: { color: palette.grey[500] }, }}
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />
                        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }}>
                            Send Reset Link
                        </Button>
                    </form>

                    {/* Display success or error message */}
                    {message && (
                        <Typography variant="body2" color="secondary" sx={{ mt: 2 }}>
                            {message}
                        </Typography>
                    )}
                </LoginRegister>
            </Grid>
        </Grid>
    )
}

export default ChangePassword;