import { Box } from "@mui/material";
import { styled } from "@mui/material";

const DashboardBox = styled(Box)(({theme}) => ({
    backgroundColor: theme.palette.background.light,
    borderRadius: "2rem",
    boxShadow: "0.15rem 0.2rem 0.15rem rgba(0,0,0,.8)",
    color: theme.palette.grey[500],
    padding: "20px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
}));

export default DashboardBox;