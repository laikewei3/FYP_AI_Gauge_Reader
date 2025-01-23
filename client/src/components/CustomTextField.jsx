import { styled, TextField } from "@mui/material";

const CustomTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[700],
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: theme.palette.grey[500],
  },
  "& .MuiInputBase-root.Mui-disabled": {
    "& > fieldset": {
      borderColor: 'transparent'
    }
  },
  "& .MuiSvgIcon-root": {
      color: theme.palette.grey[300],
  },
}));

export default CustomTextField;