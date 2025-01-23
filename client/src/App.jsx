import { ThemeProvider, createTheme } from "@mui/material/styles";
import { createContext, useMemo, useState, useEffect } from "react";
import { themeSettings } from "./theme";
import CircularProgress from '@mui/material/CircularProgress';
import { Box, CssBaseline, Typography } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "@/scenes/Navbar";
import Dashboard from "@/scenes/Dashboard";
import Settings from "@/scenes/Settings";
import ItemDashboard from "@/scenes/ItemDashboard";
import Cookies from "js-cookie";
import Login from "@/scenes/Settings/Login";
import Register from "@/scenes/Settings/Register";
import CompanyRegister from "@/scenes/Settings/CompanyRegister";
import Home from "@/scenes/Home";
import UserManagement from "@/scenes/Settings/UserManagement";
import ChangePassword from "./scenes/Settings/ChangePassword";
import ResetPassword from "./scenes/Settings/ResetPassword";
import GetStarted from "./scenes/Home/GetStarted";
import ExploreFeatures from "./scenes/Home/ExploreFeatures";

export const TokenApi = createContext();
export const AuthApi = createContext();

function App() {
  const theme = useMemo(() => createTheme(themeSettings), []);

  const [auth, setAuth] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);  // New loading state

  const readCookie = () => {
    let token = Cookies.get("token");
    if (token) {
      setAuth(true);
      setToken(token);
    }
    setLoading(false);  // Token check is complete
  };

  useEffect(() => {
    readCookie();
  }, []);

  if (loading) {
    return <Box textAlign="center">
      <CircularProgress color="success" size="3rem"/>
      <Typography
        variant="h3"
        style={{
          color: theme.palette.grey[500],  // Light text color
          marginTop: '1rem'
        }}
      >
        Loading......
      </Typography>
    </Box>
  }

  return (
    <div className="app">
      <AuthApi.Provider value={{ auth, setAuth }}>
        <TokenApi.Provider value={{ token, setToken }}>
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <Box width="100%" height="100%" padding="15px">
                <Navbar />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/GetStarted" element={<GetStarted />} />
                  <Route path="/ExploreFeatures" element={<ExploreFeatures />} />
                  <Route path="/Login" element={!auth ? <Login /> : <Navigate to="/" />} />
                  <Route path="/Register" element={!auth ? <Register /> : <Navigate to="/" />} />
                  <Route path="/ChangePassword" element={!auth ? <ChangePassword /> : <Navigate to="/" />} />
                  <Route path="/CompanyRegister" element={<CompanyRegister />} />
                  <Route path="/ResetPassword/:token" element={<ResetPassword/>} />
                
                  {/* Protected Routes - Accessible only if authenticated */}
                  <Route path="/:username/Dashboard" element={auth ? <Dashboard /> : <Navigate to="/Login" />} />
                  <Route path="/:username/Dashboard/:sourceId" element={auth ? <ItemDashboard /> : <Navigate to="/Login" />} />
                  <Route path="/:username/Settings" element={auth ? <Settings /> : <Navigate to="/Login" />} />
                  <Route path="/:username/user-management" element={auth ? <UserManagement /> : <Navigate to="/Login" />} />
                </Routes>
              </Box>
            </ThemeProvider>
          </BrowserRouter>
        </TokenApi.Provider>
      </AuthApi.Provider>
    </div>
  );
}

export default App;
