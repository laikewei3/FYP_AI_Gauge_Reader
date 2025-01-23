import CustomTextField from "@/components/CustomTextField";
import LoginRegister from "@/components/LoginRegister";
import { Avatar, Button, Grid, Typography, useTheme, Radio, FormControlLabel } from "@mui/material";
import { useState, useEffect } from "react";
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import SearchableSelect from "@/components/SearchableSelect";
import * as yup from 'yup';
import Cookies from 'js-cookie';
import countryCodes from "@/assets/countryCodes";

// Validation schema using Yup
const passwordValidationSchema = yup.string()
    .min(8, 'Password must be at least 8 characters long')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .matches(/[@$!%*?&#]/, 'Password must contain at least one special character');

const Register = () => {
    const navigate = useNavigate();
    const { palette } = useTheme();
    const btnStyle = { margin: "8px 0" }
    // State for errors
    const [errors, setErrors] = useState({});
    const [companyOptions, setCompanyOptions] = useState([])
    useEffect(() => {
        // Fetch the companies from the backend
        axios.get("http://127.0.0.1:8000/companies/")
            .then(response => {
                const options = response.data.map(company => ({
                    label: company.name,  // The company name as label
                    value: company._id    // The company id as value
                }));
                const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label));
                setCompanyOptions(sortedOptions);  // Set the options with company data
            })
            .catch(error => {
                console.error("Error fetching companies:", error);
            });
    }, []);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [accountType, setAccountType] = useState("personal");
    const [company, setCompany] = useState("");
    const [reconfirmPassword, setReconfirmPassword] = useState('');
    const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
    const [usernameInvalid, setUsernameInvalid] = useState(false)
    const [countryCode, setCountryCode] = useState("");

    const handleAccountType = (evt) => {
        setAccountType(evt.target.value);
    };

    const handleUsernameChange = async (e) => {
        setUsername(e.target.value);
        // Check if username is available
        try {
            await axios.get(`http://127.0.0.1:8000/check-username/${e.target.value}`);
            setIsUsernameAvailable(true); // Username is available
        } catch (error) {
            setIsUsernameAvailable(false); // Username is taken
        }
    };

    const handleSubmit = async (evt) => {
        const fullPhoneNumber = `${countryCode}${phone}`; // Combine country code and phone number
        const data = {
            email: email,
            password: password,
            username: username,
            phone: fullPhoneNumber,  // Use the combined phone number
            accountType: accountType,
            role: accountType === "company" ? "pending" : "user", // Set role based on accountType
            companyId: accountType === "company" ? company : undefined
        };
        console.log(data);
        const response = await axios.post("http://127.0.0.1:8000/register", data)
        console.log(response);
        alert("User created: " + response.data.res);

        if (accountType !== "company") {
            const loginData = new URLSearchParams();
            loginData.append("username", username);
            loginData.append("password", password);
            const loginResponse = await axios.post("http://127.0.0.1:8000/login", loginData);
            console.log(loginResponse);

            const token = loginResponse.data.access_token;

            // Save token in cookies
            Cookies.set("token", token);
            navigate(`/${data.username}/Settings`);
            setEmail(""); setPassword(""); setReconfirmPassword(""); setUsername(""); setPhone(""); setCompany(""); setAccountType("personal");
            setErrors({});

            window.location.reload();
        } else {
            navigate("/Login")
        }
    };

    const validateForm = () => {
        let newErrors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(email)) {
            newErrors.email = "Invalid email format";
        }

        // Username validation
        if (!username) {
            newErrors.username = "Username is required";
        } else if (!isUsernameAvailable) {
            newErrors.username = "Username is already taken";
        }

        // Phone validation
        // const phoneRegex = /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/; // Adjust this regex based on the country format
        const phoneRegex = /^[0-9]{7,15}$/;
        if (!phone) {
            newErrors.phone = "Phone number is required";
        } else if (!phoneRegex.test(phone)) {
            newErrors.phone = "Invalid phone number format";
        }

        // Country code validation
        if (!countryCode) {
            newErrors.countryCode = "Country code is required";
        }

        // Password validation
        if (!password) {
            newErrors.password = "Password is required";
        } else if (!passwordValidationSchema.isValidSync(password)) {
            newErrors.password = "Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
        }

        // Reconfirm Password validation
        if (!reconfirmPassword) {
            newErrors.reconfirmPassword = "Passwords do not match";
        }

        // Company name validation
        if (accountType === "company" && !company) {
            newErrors.company = "Company name is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Returns true if no errors
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setUsernameInvalid(false);
        const isValid = validateForm();
        if (isValid) {
            // Proceed with form submission
            handleSubmit();
        }
    };

    const handleAutocompleteChange = (e, getTagProps) => {

        // you can get the index of the option selected from the event target
        const optionIndex = e.target.dataset.optionIndex;
        // setCompany(getTagProps);
        setCompany(companyOptions[optionIndex].value);
    }

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
                    <Grid align="center">
                        <Avatar />
                        <h2>Registration</h2>
                        {usernameInvalid && <Typography
                            color={palette.secondary.main}
                            sx={{ backgroundColor: palette.secondary[900], padding: '8px', borderRadius: '4px' }}>
                            Email has been used by another account. <br /> Please Try Another Email for Registration or Login!
                        </Typography>}
                    </Grid>
                    <form onSubmit={handleFormSubmit}>
                        <CustomTextField label="Email"
                            placeholder="Enter Email"
                            value={email}
                            error={!!errors.email} // Highlight if error exists
                            helperText={errors.email} // Show error message
                            InputLabelProps={{ style: { color: palette.grey[500] }, }}
                            onChange={(e) => setEmail(e.target.value)}
                            sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                        <CustomTextField label="Username"
                            placeholder="Enter Username"
                            value={username}
                            error={!!errors.username || !isUsernameAvailable}
                            helperText={errors.username || (!isUsernameAvailable ? "Username is already taken" : "")} // Show error message
                            InputLabelProps={{ style: { color: palette.grey[500] }, }}
                            onChange={handleUsernameChange}
                            sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                        <SearchableSelect
                            options={countryCodes}
                            label="Country Code"
                            placeholder="Country Code"
                            value={countryCode}
                            onInputChange={(e, newValue) => {
                                const match = newValue.match(/\(([^)]+)\)/);
                                setCountryCode(match ? match[1] : '')
                            }}
                            InputLabelProps={{ style: { color: palette.grey[500] } }}
                            sx={{ input: { color: palette.grey[300] } }}
                            error={!!errors.countryCode} // Highlight if error exists
                            helperText={errors.countryCode} // Show error message
                            margin="normal"
                            fullWidth
                        />

                        <CustomTextField label="Phone"
                            placeholder="Enter phone number"
                            InputLabelProps={{ style: { color: palette.grey[500] }, }}
                            error={!!errors.phone}
                            helperText={errors.phone}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                        <CustomTextField label="Password"
                            placeholder="Enter password"
                            InputLabelProps={{ style: { color: palette.grey[500] }, }}
                            type="password"
                            value={password}
                            error={!!errors.password}
                            helperText={errors.password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                        <CustomTextField label="Recomfirm Password"
                            placeholder="Enter password Again"
                            value={reconfirmPassword}
                            error={reconfirmPassword !== password || !!errors.reconfirmPassword}
                            helperText={((reconfirmPassword !== password || errors.reconfirmPassword)
                                ? "Passwords do not match"
                                : "")}
                            onChange={(e) => setReconfirmPassword(e.target.value)}
                            InputLabelProps={{ style: { color: palette.grey[500] }, }}
                            type="password"
                            sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                        <FormControlLabel
                            control={
                                <Radio
                                    checked={accountType === 'personal'}
                                    onChange={handleAccountType}
                                    value="personal"
                                    name="radio-buttons"
                                    inputProps={{ 'aria-label': 'personal' }}
                                    sx={{
                                        color: palette.grey[500], // Color when not selected
                                        '&.Mui-checked': {
                                            color: 'primary.main', // Color when selected
                                        },
                                    }}
                                />
                            }
                            label="Personal"
                        />
                        <FormControlLabel
                            control={
                                <Radio
                                    checked={accountType === 'company'}
                                    onChange={handleAccountType}
                                    value="company"
                                    name="radio-buttons"
                                    inputProps={{ 'aria-label': 'company' }}
                                    sx={{
                                        color: palette.grey[500], // Color when not selected
                                        '&.Mui-checked': {
                                            color: 'primary.main', // Color when selected
                                        },
                                    }}
                                />
                            }
                            label="Company"
                        />

                        {accountType === "company" && (
                            <SearchableSelect
                                options={companyOptions}
                                label="Company Name"
                                placeholder="Enter your company name"
                                InputLabelProps={{ style: { color: palette.grey[500] } }}
                                sx={{ input: { color: palette.grey[300] } }}
                                margin="normal"
                                required={false}
                                error={!!errors.company} // Check for error state
                                helperText={errors.company} // Show error message
                                fullWidth
                                value={company}
                                onChange={(e, getTagProps) => handleAutocompleteChange(e, getTagProps)}
                            />
                        )}

                        <Button type="submit" color="primary" variant="contained" style={btnStyle} fullWidth>Register</Button>
                    </form>
                    <hr></hr>
                    <Typography margin="10px">
                        Already have an account? <br />
                        <Link to="/Login" style={{ color: "green", textDecoration: 'none' }}>
                            Log in
                        </Link>
                    </Typography>
                    {/* <hr></hr>
                    <Button color="primary" variant="contained" style={btnStyle} fullWidth>Google</Button> */}
                </LoginRegister>
            </Grid>
        </Grid>
    )
}

export default Register;