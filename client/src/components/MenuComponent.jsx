import { Menu } from "@mui/material";
import { styled } from "@mui/material";

const MenuComponent = styled(Menu)(({theme}) => ({
    "& .MuiPaper-root": {
        backgroundColor: theme.palette.background.light,
        color: theme.palette.grey[500],
        },
    position: "absolute",
    zIndex: 1000, // keep the z-index to ensure it appears on top
}));

export default MenuComponent;