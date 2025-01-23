import MenuComponent from '@/components/MenuComponent';
import { useTheme } from '@emotion/react';
import { MenuItem } from '@mui/material';
import { Link } from 'react-router-dom';
import Cookies from 'js-cookie';
import { AuthApi, TokenApi } from "@/App";
import { useContext, useEffect, useState } from 'react';
import axios from 'axios'

const SettingsMenuLogOut = ({ anchorEl, isMenuOpen, setIsMenuOpen, setSelected }) => {
    const Auth = useContext(AuthApi);
    const Token = useContext(TokenApi);
    const [user, setUser] = useState("");

    let toke = Token.token;

    const headers = {
        Authorization: `Bearer ${toke}`,
    };
    const getdata = async () => {
        let res = await axios
            .get("http://127.0.0.1:8000/", { headers })
            .then((response) => {
                console.log("Current User:", response.data.data);
                return response.data.data;
            });
        return res;
    };

    // Using a normal function inside useEffect
    useEffect(() => {
        const fetchData = async () => {
            let x = await getdata();
            setUser(x);
            console.log(x);
        };

        fetchData(); // Call the async function
    }, []); // Empty dependency array means this runs only on mount

    const handleClose = () => {
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        Auth.setAuth(false);
        // Clear the cookie
        Cookies.remove("token", { path: '/', domain: 'localhost' }); // Adjust this to your cookie name
        window.location.href = "/Login"; // Redirect after logout
    };

    const { palette } = useTheme();
    return (
        <MenuComponent
            id="menu"
            anchorEl={anchorEl}
            keepMounted
            open={isMenuOpen}
            onClose={handleClose}
            MenuListProps={{
                'aria-labelledby': 'menu-button'
            }}
        >
            {/* /${userData}/Settings */}
            <MenuItem
                component={Link}
                to={`/${user}/Settings`}
                onClick={() => {
                    handleClose();
                    setSelected("Settings");
                }}
                style={{ color: palette.grey[500] }}
            >
                Settings
            </MenuItem>
            <MenuItem
                component={Link}
                to="/Login"
                onClick={() => {
                    handleClose();
                    handleLogout();
                    setSelected("Settings")
                }}>
                Log Out
            </MenuItem>
        </MenuComponent>
    );
};

export default SettingsMenuLogOut