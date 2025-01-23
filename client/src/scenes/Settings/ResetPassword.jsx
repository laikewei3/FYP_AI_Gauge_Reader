import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Typography, Grid } from '@mui/material';
import LoginRegister from '@/components/LoginRegister';
import CustomTextField from '@/components/CustomTextField';
import { useTheme } from '@emotion/react';
import * as yup from 'yup';

// Validation schema using Yup
const passwordValidationSchema = yup.string()
    .min(8, 'Password must be at least 8 characters long')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .matches(/[@$!%*?&#]/, 'Password must contain at least one special character');

const ResetPassword = () => {
    const { token } = useParams();  // Get the reset token from URL
    const { palette } = useTheme();
    const [newPassword, setNewPassword] = useState('');
    const [reconfirmPassword, setReconfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        let newErrors = {};

        // Password validation
        if (!newPassword) {
            newErrors.password = "Password is required";
        } else if (!passwordValidationSchema.isValidSync(newPassword)) {
            newErrors.password = "Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
        }

        // Reconfirm Password validation
        if (!reconfirmPassword) {
            newErrors.reconfirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Returns true if no errors
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const isValid = validateForm();
        if (isValid) {
            // Proceed with form submission
            handleSubmit();
        }
    };

    const handleSubmit = async (e) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/reset_password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ "reset_token": token,
                    "new_password": newPassword }),  // Send token and new password
            });

            if (!response.ok) {
                throw new Error('Failed to reset password');
            }

            const result = await response.json();
            setMessage(result.message);
            setErrors({})
        } catch (error) {
            console.error('Error:', error);
            setMessage('Error resetting password');
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
                        Reset Password
                    </Typography>
                    <form onSubmit={handleFormSubmit}>
                        <CustomTextField
                            InputLabelProps={{ style: { color: palette.grey[500] }, }}
                            sx={{ input: { color: palette.grey[300] } }}
                            fullWidth
                            margin="normal"
                            label="New Password"
                            type="password"
                            value={newPassword}
                            error={!!errors.password}
                            helperText={errors.password}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <CustomTextField
                            InputLabelProps={{ style: { color: palette.grey[500] }, }}
                            sx={{ input: { color: palette.grey[300] } }}
                            fullWidth
                            margin="normal"
                            label="Reconfirm Password"
                            type="password"
                            value={reconfirmPassword}
                            error={reconfirmPassword !== newPassword || !!errors.reconfirmPassword}
                            helperText={((reconfirmPassword !== newPassword || errors.reconfirmPassword)
                                ? "Passwords do not match"
                                : "")}
                            onChange={(e) => setReconfirmPassword(e.target.value)}
                        />
                        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }}>
                            Reset Password
                        </Button>
                    </form>
                    {message && (
                        <Typography variant="body2" color="secondary" sx={{ mt: 2 }}>
                            {message}
                        </Typography>
                    )}
                </LoginRegister>
            </Grid>
        </Grid>
    );
};

export default ResetPassword;