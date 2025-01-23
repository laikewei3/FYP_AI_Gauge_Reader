import { Autocomplete} from '@mui/material';
import CustomTextField from './CustomTextField';
import { Popper, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@emotion/react';


const SearchableSelectDepartments = ({ disabled, multiple, error, helperTexts, options, label, placeholder, InputLabelProps, sx, margin, fullWidth, required, value, onInputChange, onChange }) => {
  const { palette } = useTheme();
  // Custom Popper styling to make the entire dropdown grey
  const StyledPopper = styled(Popper)({
    '.MuiAutocomplete-listbox': {
      backgroundColor: palette.grey[900],  // This changes the background of the listbox (options)
      '& li': {
        '&:hover': {
          backgroundColor: palette.primary[700],  // Hover background color
        },
      },
    },
    '.MuiAutocomplete-paper': {
      backgroundColor: palette.grey[900],  // This changes the background of the entire dropdown
    },
    '.MuiAutocomplete-tag': {
      backgroundColor: palette.grey[500],
      '& .MuiChip-label': {  // Add this to target the text inside the chip
        color: palette.grey[300],  // Adjust the grey shade as needed
      },
    }
  });

  // customize Paper for extra styling if required
  const StyledPaper = styled(Paper)({
    backgroundColor: 'grey',
  });
  
  return (
    <Autocomplete
      multiple={multiple}
      onChange={onChange}
      onInputChange={onInputChange}
      value={value}
      options={options}
      getOptionLabel={(option) => option.label}
      disabled={disabled}
      ChipProps={{
        sx: {
          backgroundColor: palette.grey[800],
          '& .MuiChip-label': {
            color: palette.grey[500],
          }
        }
      }}
      renderInput={(params) => (
        <CustomTextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputLabelProps={InputLabelProps}
          sx={sx}
          error={error}
          helperText={helperTexts}
          margin={margin}
          fullWidth={fullWidth}
          required={required}
          value={value}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <li key={key} {...rest} style={{ color: palette.grey[500] }}>
            {option.label}
          </li>
        );
      }}
      PopperComponent={StyledPopper}
      PaperComponent={StyledPaper}  // Optional, for further customization
    />
  );
};

export default SearchableSelectDepartments;
