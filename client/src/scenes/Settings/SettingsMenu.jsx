import MenuComponent from '@/components/MenuComponent';
import { useTheme } from '@emotion/react';
import { MenuItem } from '@mui/material';
import { Link } from 'react-router-dom'

const SettingsMenu = ({ anchorEl, isMenuOpen, setIsMenuOpen, setSelected }) => {
    const { palette } = useTheme();

    const handleClose = () => {
        setIsMenuOpen(false);
    };


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

            <MenuItem
                component={Link}
                to="/Login"
                onClick={() => {
                    handleClose();
                    setSelected("Settings");
                }}
                style={{ color: palette.grey[500] }}
            >
                SignIn/Register
            </MenuItem>
            <MenuItem
                component={Link}
                to="/CompanyRegister"
                onClick={() => {
                    handleClose();
                    setSelected("Settings")
                }}>
                Company Registration
            </MenuItem>
        </MenuComponent>
    );
};

export default SettingsMenu