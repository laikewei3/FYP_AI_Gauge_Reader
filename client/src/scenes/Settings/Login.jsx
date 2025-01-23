import CustomTextField from "@/components/CustomTextField";
import LoginRegister from "@/components/LoginRegister";
import { Avatar, Button, Grid, Typography, useTheme } from "@mui/material";
import axios from 'axios'
import { useContext, useState } from 'react'
import Cookies from 'js-cookie';
import { Link, useNavigate } from 'react-router-dom'
import { TokenApi } from "@/App";

const Login = () => {
  const navigate = useNavigate();
  const Token = useContext(TokenApi);
  const { palette } = useTheme();
  const btnStyle = { margin: "8px 0" }
  const [loginError, setLoginError] = useState({});
  const [usernamePasswordInvalid, setUsernamePasswordInvalid] = useState("")
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  // Login and fetch token function
  const handleSubmit = async (evt) => {
    if (evt) {
      evt.preventDefault();
    }

    const data = new URLSearchParams();
    data.append("username", name);
    data.append("password", password);

    try {
      // 1. Attempt login to get token
      const loginResponse = await axios.post("http://127.0.0.1:8000/login", data);
      console.log(loginResponse);

      const token = loginResponse.data.access_token;

      // 2. Save token in cookies
      Cookies.set("token", token);

      // 3. Set token in the TokenApi context
      // Token.setToken(token);

      // Clear the login form
      setLoginError({});
      setName("");
      setPassword("");

      // 4. Fetch user data with the token
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const getUserData = async () => {
        try {
          const response = await axios.get("http://127.0.0.1:8000/", { headers });
          return response.data.data;
        } catch (error) {
          console.error("Error fetching user data:", error);
          return null;
        }
      };

      // Fetch the user data after successful login
      const userData = await getUserData();

      if (userData) {
        console.log(userData);

        // 5. Navigate to the user's settings page
        navigate(`/${userData}/Settings`);

        // Optionally reload the page if needed
        window.location.reload();
      }
    } catch (error) {
      if (error.response) {
        if (error.response.data.detail === "Account pending approval") {
          setUsernamePasswordInvalid("Your account status is pending approval, please contact your admin.");
        } else if (error.response.data.detail === "User not found") {
          setUsernamePasswordInvalid("User not found.");
        } else if (error.response.data.detail === "Incorrect password") {
          setUsernamePasswordInvalid("Incorrect password.");
        } else {
          setUsernamePasswordInvalid("An unknown error occurred.");
        }
      } else {
        setUsernamePasswordInvalid("An unknown error occurred.");
      }
    }
  };

  const validateForm = () => {
    let newErrors = {};

    // Email validation
    if (!name) {
      newErrors.name = "Username / Email is required";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    }

    setLoginError(newErrors);
    return Object.keys(newErrors).length === 0; // Returns true if no errors
  };

  const handleFormSubmit = (e) => {
    setUsernamePasswordInvalid(false);
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
      <Grid item xs={1}>
        <LoginRegister>
          <Grid align="center">
            <Avatar />
            <h2>Sign In</h2>
            {usernamePasswordInvalid && (
              <Typography
                color={palette.secondary.main}
                sx={{ backgroundColor: palette.secondary[900], padding: '8px', borderRadius: '4px' }}>
                {usernamePasswordInvalid} <br /> Please Try Again!
              </Typography>
            )}
          </Grid>
          <form onSubmit={handleFormSubmit}>
            <CustomTextField
              label="Username / Email"
              placeholder="Enter username or email"
              InputLabelProps={{ style: { color: palette.grey[500] }, }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!loginError.name}
              helperText={loginError.name}
              sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />
            <CustomTextField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!loginError.password}
              helperText={loginError.password}
              label="Password" placeholder="Enter password" InputLabelProps={{ style: { color: palette.grey[500] }, }}
              type="password" sx={{ input: { color: palette.grey[300] } }} margin="normal" fullWidth />
            {/* <FormControlLabel
            control={
              <Checkbox
                name="checkedB"
                color="primary"
              />
            }
            label="Remember me"
          /> */}
            <Button type="submit" color="primary" variant="contained" style={btnStyle} fullWidth>Sign in</Button>
          </form>
          <Typography margin="10px">
            <Link to="/ChangePassword" style={{ color: "green", textDecoration: 'none' }}>
              Forget Password?
            </Link>
          </Typography>
          <hr></hr>
          <Typography>
            Do you have an account? <br />
            <Link to="/Register" style={{ color: "green", textDecoration: 'none' }}>
              Sign Up
            </Link>
          </Typography>
          {/* <hr></hr>
          <Button type="submit" color="primary" variant="contained" style={btnStyle} fullWidth>Google</Button> */}
        </LoginRegister>
      </Grid>
    </Grid>
  )
}

export default Login;