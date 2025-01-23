import { Box } from "@mui/material";
import { styled } from "@mui/material";

const LoginRegister = styled(Box)(({theme}) => ({
    padding: 20,
    margin: "auto",
    borderRadius: "1rem",
    boxShadow: "0.15rem 0.2rem 0.15rem rgba(0,0,0,.5)",
    textAlign: 'center',
    color: theme.palette.grey[500],
    backgroundColor: theme.palette.background.light,
    [theme.breakpoints.down('md')]: {
        width: '70%',
    },
    [theme.breakpoints.down('sm')]: {
        width: '100%',
    },
    [theme.breakpoints.down('xs')]: {
        width: '100%',
    }
}));

export default LoginRegister;