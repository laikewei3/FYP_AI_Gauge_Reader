import { Box, Typography, useTheme, Button, IconButton, MenuItem } from '@mui/material'
import MenuComponent from '@/components/MenuComponent';
import { Link } from 'react-router-dom'
import { useContext, useEffect, useState } from 'react'
import FlexBetween from '@/components/FlexBetween';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsTwoToneIcon from '@mui/icons-material/SettingsTwoTone';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsMenu from '@/scenes/Settings/SettingsMenu';
import SettingsMenuLogOut from '@/scenes/Settings/SettingsMenuLogOut';
import { AuthApi, TokenApi } from "@/App";
import axios from 'axios'


const Navbar = () => {
    const Auth = useContext(AuthApi);
    const Token = useContext(TokenApi);
    const [user, setUser] = useState("");
    const { palette } = useTheme();
    const [selected, setSelected] = useState("Home");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            let toke = Token.token; // Get the token here
            if (toke === "") {
                console.log("Token is empty, skipping fetch.");
                return null; // Return null if token is empty
            }
    
            const headers = {
                Authorization: `Bearer ${toke}`, // Use template literals correctly
            };
    
            try {
                let res = await axios.get("http://127.0.0.1:8000/", { headers });
                console.log("Current User:", res.data.data);
                return res.data.data;
            } catch (error) {
                console.error("Error fetching data:", error.response ? error.response.data : error.message);
                return null; // Handle error and return null
            }
        };
    
        const fetchDataAndSetUser = async () => {
            let x = await fetchData();
            if (x) { // Check if x is not null before setting user
                setUser(x);
                console.log(x);
            }
        };
    
        fetchDataAndSetUser(); // Call the async function
    }, [Token.token]); // Now the useEffect depends on Token.token
    
    const handleMobileMenuOpen = (event) => {
        setMobileMenuAnchorEl(event.currentTarget);
    };

    const handleMobileMenuClose = () => {
        setMobileMenuAnchorEl(null);
    };

    return (
        <FlexBetween
            color={palette.grey[300]}
            p="0.5rem 0rem"
            mb="0.25rem">
            {/* Left Side - LOGO NAME */}
            <FlexBetween gap="0.50rem">
                <SpeedIcon sx={{ fontSize: "28px" }} />
                <Typography variant='h6' fontSize="18px" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    InsightGauge
                </Typography>
            </FlexBetween>

            {/* Right Side - Navigation */}
            <FlexBetween gap="2rem" sx={{ display: { xs: 'none', sm: 'flex' } }}>
                <Box sx={{ "&:hover": { color: palette.grey[100] } }}>
                    <Link to="/" onClick={() => setSelected("Home")}
                        style={{
                            color: selected === "Home" ? "inherit" : palette.grey[700],
                            textDecoration: "inherit"
                        }}>
                        Home
                    </Link>
                </Box>
                <Box sx={{ "&:hover": { color: palette.grey[100] } }}>
                    <Link 
                      to={Auth.auth ? `/${user}/Dashboard` : "/Login"}
                      onClick={() => {
                        setSelected("Dashboard");
                      }}
                        style={{
                            color: selected === "Dashboard" ? "inherit" : palette.grey[700],
                            textDecoration: "inherit"
                        }}>
                        Dashboard
                    </Link>
                </Box>
                <Box sx={{ "&:hover": { color: palette.grey[100] } }}>
                    <Link
                        component={Button}
                        aria-controls="menu"
                        aria-haspopup="true"
                        onClick={(event) => {
                            setAnchorEl(event.currentTarget);
                            setIsMenuOpen(!isMenuOpen);
                        }}
                        style={{
                            color: selected === "Settings" ? "inherit" : palette.grey[700],
                        }}>
                        <SettingsTwoToneIcon />
                    </Link>
                    {Auth.auth ? (
                        <SettingsMenuLogOut
                            anchorEl={anchorEl}
                            isMenuOpen={isMenuOpen}
                            setIsMenuOpen={setIsMenuOpen}
                            setSelected={setSelected}
                        />
                    ) : (
                        <SettingsMenu
                            anchorEl={anchorEl}
                            isMenuOpen={isMenuOpen}
                            setIsMenuOpen={setIsMenuOpen}
                            setSelected={setSelected}
                        />
                    )}
                </Box>
            </FlexBetween>

            {/* Mobile Menu */}
            <IconButton
                edge="end"
                color="inherit"
                aria-label="menu"
                sx={{ display: { xs: 'flex', sm: 'none' } }}
                onClick={handleMobileMenuOpen}
            >
                <MenuIcon />
            </IconButton>
            <MenuComponent
                anchorEl={mobileMenuAnchorEl}
                open={Boolean(mobileMenuAnchorEl)}
                onClose={handleMobileMenuClose}
            >
                <MenuItem onClick={handleMobileMenuClose}>
                    <Link to="/" onClick={() => setSelected("Home")}
                        style={{
                            color: selected === "Home" ? "inherit" : palette.grey[700],
                            textDecoration: "inherit"
                        }}>
                        Home
                    </Link>
                </MenuItem>
                <MenuItem onClick={handleMobileMenuClose}>
                    <Link 
                      to={Auth.auth ? `/${user}/Dashboard` : "/Login"}
                      onClick={() => {
                        setSelected("Dashboard");
                      }}
                        style={{
                            color: selected === "Dashboard" ? "inherit" : palette.grey[700],
                            textDecoration: "inherit"
                        }}>
                        Dashboard
                    </Link>
                </MenuItem>
                <MenuItem onClick={handleMobileMenuClose}>
                    <Link
                        component={Button}
                        aria-controls="menu"
                        aria-haspopup="true"
                        onClick={(event) => {
                            setAnchorEl(event.currentTarget);
                            setIsMenuOpen(!isMenuOpen);
                        }}
                        style={{
                            color: selected === "Settings" ? "inherit" : palette.grey[700],
                        }}>
                        <SettingsTwoToneIcon />
                    </Link>
                </MenuItem>
            </MenuComponent>
        </FlexBetween>
    )
}

export default Navbar