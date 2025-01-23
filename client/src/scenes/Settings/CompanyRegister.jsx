import CustomTextField from "@/components/CustomTextField";
import LoginRegister from "@/components/LoginRegister";
import { Button, Grid, useTheme, Typography } from "@mui/material";
import BusinessIcon from '@mui/icons-material/Business';
import axios from 'axios'
import SearchableSelect from "@/components/SearchableSelect";
import { useState } from "react";
import * as yup from 'yup';
import countryCodes from "@/assets/countryCodes";

// Validation schema using Yup
const passwordValidationSchema = yup.string()
    .min(8, 'Password must be at least 8 characters long')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .matches(/[@$!%*?&#]/, 'Password must contain at least one special character');

const CompanyRegister = () => {
    const options = [
        { label: 'Johor', value: 'Johor' },
        { label: 'Kedah', value: 'Kedah' },
        { label: 'Kelantan', value: 'Kelantan' },
        { label: 'Malacca (Melaka)', value: 'Malacca' },
        { label: 'Negeri Sembilan', value: 'NegeriSembilan' },
        { label: 'Pahang', value: 'Pahang' },
        { label: 'Penang (Pulau Pinang)', value: 'Penang' },
        { label: 'Perak', value: 'Perak' },
        { label: 'Perlis', value: 'Perlis' },
        { label: 'Sabah', value: 'Sabah' },
        { label: 'Sarawak', value: 'Sarawak' },
        { label: 'Selangor', value: 'Selangor' },
        { label: 'Terengganu', value: 'Terengganu' },
        { label: 'Kuala Lumpur', value: 'KualaLumpur' },
        { label: 'Labuan', value: 'Labuan' },
        { label: 'Putrajaya', value: 'Putrajaya' }
    ];

    const { palette } = useTheme();
    const btnStyle = { margin: "8px 0" }
    const [CompanyRegisterError, setCompanyRegisterError] = useState({});

    const [name, setName] = useState("");
    const [address1, setAddress1] = useState("");
    const [address2, setAddress2] = useState("");
    const [postcode, setPostcode] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [countryCode, setCountryCode] = useState("");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [reconfirmPassword, setReconfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");

    const handleSubmit = (evt) => {
        const company_data = {
            name: name,
            address1: address1,
            address2: address2 !== "" ? address2 : undefined,  // Omit if empty
            postcode: postcode,
            city: city,
            state: state
        };

        const fullPhoneNumber = `${countryCode}${phone}`; // Combine country code and phone number

        axios(
            {
                method: 'post',
                url: "http://127.0.0.1:8000/register_company",
                data: company_data,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
            .then(async (response) => {
                const companyId = response.data.company_id;  // Get the company ID from the response

                const user_data = {
                    email: email,
                    password: password,
                    username: username,
                    phone: fullPhoneNumber,  // Use the combined phone number
                    companyId: companyId,  // Set companyId to the registered company ID
                    accountType: "company",  // Set the account type
                    role: "admin"  // Set the role
                };

                return axios.post("http://127.0.0.1:8000/register", user_data);
            })
            .then((response) => {
                console.log(response);
                alert("Company and user registered successfully!");
                setName(""); setAddress1(""); setAddress2(""); setPostcode(""); setCity(""); setState("");
                setEmail(""); setPassword(""); setReconfirmPassword(""); setUsername(""); setPhone("");
                setCompanyRegisterError({});
            })
            .catch((error) => {
                console.error(error.response.data); // Log the full error response
                alert("Error registering company or user: " + error);
            });
    };

    const validateForm = () => {
        let newErrors = {};

        if (!name) newErrors.name = "Company Name is required";
        if (!address1) newErrors.address1 = "Address is required";
        if (!postcode) newErrors.postcode = "Postcode is required";
        if (!city) newErrors.city = "City is required";
        if (!state) newErrors.state = "State is required";

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
        }

        // Phone validation
        const phoneRegex = /^[0-9]{7,15}$/; // Adjusted to validate phone number without country code
        if (!phone) {
            newErrors.phone = "Phone number is required";
        } else if (!phoneRegex.test(phone)) {
            newErrors.phone = "Invalid phone number format";
        }

        // Password validation
        if (!password) {
            newErrors.password = "Password is required";
        } else if (!passwordValidationSchema.isValidSync(password)) {
            newErrors.password = "Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
        }

        // Company name validation
        if (!reconfirmPassword) {
            newErrors.reconfirmPassword = "Passwords do not match";
        }

        // Country code validation
        if (!countryCode) {
            newErrors.countryCode = "Country code is required";
        }

        setCompanyRegisterError(newErrors);
        return Object.keys(newErrors).length === 0; // Returns true if no errors
    };

    const handleFormSubmit = (e) => {
        const isValid = validateForm();
        if (isValid) {
            // Proceed with form submission
            handleSubmit();
        }
        e.preventDefault();
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
            <Grid item xs={12}>
                <LoginRegister>
                    <Grid align="center">
                        <BusinessIcon fontSize="large" />
                        <h2>Company Registration</h2>
                    </Grid>
                    <form onSubmit={handleFormSubmit}>
                        <Grid container spacing={2}>
                            <Grid item xs={6} md={6}>
                                <CustomTextField label="Company Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter Company Name"
                                    error={!!CompanyRegisterError.name} // Highlight if error exists
                                    helperText={CompanyRegisterError.name} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                                <CustomTextField label="Address 1"
                                    value={address1}
                                    onChange={(e) => setAddress1(e.target.value)}
                                    placeholder="Address 1"
                                    error={!!CompanyRegisterError.address1} // Highlight if error exists
                                    helperText={CompanyRegisterError.address1} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                                <CustomTextField label="Address 2"
                                    value={address2}
                                    onChange={(e) => setAddress2(e.target.value)}
                                    placeholder="Address 2"
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                                <CustomTextField label="PostCode"
                                    value={postcode}
                                    onChange={(e) => setPostcode(e.target.value)}
                                    placeholder="PostCode"
                                    error={!!CompanyRegisterError.postcode} // Highlight if error exists
                                    helperText={CompanyRegisterError.postcode} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                                <CustomTextField label="City"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="City"
                                    error={!!CompanyRegisterError.city} // Highlight if error exists
                                    helperText={CompanyRegisterError.city} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                                <SearchableSelect
                                    options={options}
                                    label="State"
                                    placeholder="State"
                                    error={!!CompanyRegisterError.state} // Highlight if error exists
                                    helperText={CompanyRegisterError.state} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] } }}
                                    sx={{ input: { color: palette.grey[300] } }}
                                    margin="normal"
                                    fullWidth
                                    value={state}
                                    onInputChange={(e, newValue) => setState(newValue)}
                                />
                            </Grid>
                            <Grid item xs={6} md={6}>
                                <Typography variant="body1" fontSize="14px" marginTop="20px" textAlign="left">
                                    Note: The account registered here will be the admin account, responsible for approving registrations of company workers.
                                </Typography>

                                <CustomTextField label="Company Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Company Email"
                                    error={!!CompanyRegisterError.email} // Highlight if error exists
                                    helperText={CompanyRegisterError.email} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                                <CustomTextField label="Company Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Company Username"
                                    error={!!CompanyRegisterError.username} // Highlight if error exists
                                    helperText={CompanyRegisterError.username} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
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
                                    error={!!CompanyRegisterError.countryCode} // Highlight if error exists
                                    helperText={CompanyRegisterError.countryCode} // Show error message
                                    margin="normal"
                                    fullWidth
                                />

                                <CustomTextField label="Company Phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Company Phone"
                                    error={!!CompanyRegisterError.phone} // Highlight if error exists
                                    helperText={CompanyRegisterError.phone} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                                <CustomTextField label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    error={!!CompanyRegisterError.password} // Highlight if error exists
                                    helperText={CompanyRegisterError.password} // Show error message
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    type="password"
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />

                                <CustomTextField label="Reconfirm Password"
                                    value={reconfirmPassword}
                                    onChange={(e) => setReconfirmPassword(e.target.value)}
                                    placeholder="Reconfirm Password"
                                    error={reconfirmPassword !== password || !!CompanyRegisterError.reconfirmPassword}
                                    helperText={((reconfirmPassword !== password || CompanyRegisterError.reconfirmPassword)
                                        ? "Passwords do not match"
                                        : "")}
                                    InputLabelProps={{ style: { color: palette.grey[500] }, }}
                                    type="password"
                                    sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />
                            </Grid>
                        </Grid>
                        <Button type="submit" color="primary" variant="contained" style={btnStyle} fullWidth>Submit</Button>
                    </form>
                </LoginRegister>
            </Grid>
        </Grid>
    )
}

export default CompanyRegister;