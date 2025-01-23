import { useContext, useEffect, useState } from 'react';
import { Grid, Typography, Button, Avatar, FormControlLabel, Checkbox, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, DialogContentText } from '@mui/material';
import CustomTextField from '@/components/CustomTextField';
import { useTheme } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'
import { TokenApi, AuthApi } from "@/App";
import DeleteIcon from '@mui/icons-material/Delete';
import * as yup from 'yup';
import Cookies from 'js-cookie';
import SearchableSelectDepartments from '@/components/SearchableSelectDepartments';

const passwordValidationSchema = yup.string()
  .min(8, 'Password must be at least 8 characters long')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
  .matches(/\d/, 'Password must contain at least one number')
  .matches(/[@$!%*?&#]/, 'Password must contain at least one special character');

const Settings = () => {
  const Token = useContext(TokenApi);
  const Auth = useContext(AuthApi);
  const [user, setUser] = useState("");
  const [userId, setUserId] = useState("");
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('')
  const [departments, setDepartments] = useState([]);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [newDepartmentList, setNewDepartmentList] = useState([]);
  const [deletedDepartmentsList, setDeletedDepartmentsList] = useState([]);
  const [errorDeptMessage, setErrorDeptMessage] = useState('');
  const [emailTemp, setEmailTemp] = useState('');
  const [phoneTemp, setPhoneTemp] = useState('');
  const [reconfirmPassword, setReconfirmPassword] = useState('');
  const [passwordTemp, setPasswordTemp] = useState('');
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false); // Controls whether the fields are editable
  const [loading, setLoading] = useState(false);
  const { palette } = useTheme();

  // Alert preferences state
  const [alertPreferences, setAlertPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false
  });
  const [alertPreferencesTemp, setAlertPreferencesTemp] = useState({
    emailNotifications: true,
    smsNotifications: false
  });

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      let toke = Token.token; // Get the token here
      if (!toke) { // If token is empty or null
        console.log("Token is empty, skipping fetch.");
        return null; // Return null if token is empty
      }

      const headers = {
        Authorization: `Bearer ${toke}`, // Use template literals correctly
      };

      try {
        // Fetch current user data
        let res = await axios.get("http://127.0.0.1:8000/", { headers });
        let currentUser = res.data.data;

        // Now fetch additional user data using the username
        let userResponse = await axios.get(`http://127.0.0.1:8000/users_by_username/${currentUser}`, { headers });
        let userData = userResponse.data;

        // Set the state with the fetched user data
        setUserId(userData.id)
        setEmail(userData.email);
        setPhone(userData.phone);
        setEmailTemp(userData.email);
        setPhoneTemp(userData.phone);
        setAccountType(userData.accountType);
        setIsCompanyAdmin(userData.role === "admin");
        // Set alert preferences
        setAlertPreferences({
          emailNotifications: userData.alertPreferences.email,
          smsNotifications: userData.alertPreferences.sms
        });
        setAlertPreferencesTemp({
          emailNotifications: userData.alertPreferences.email,
          smsNotifications: userData.alertPreferences.sms
        });
        if (userData.companyId && userData.accountType === "company") {
          const companyResponse = await axios.get(`http://127.0.0.1:8000/companies/${userData.companyId}`, { headers });
          const company = companyResponse.data;
          if (company) {
            setCompanyId(userData.companyId);
            setCompanyName(company.name); // Assuming this is the company ID
          }
        }
        let departments_list = [];
        try {
          // Fetch all departments for the given company
          const response = await axios.get(`http://127.0.0.1:8000/company_departments/${userData.companyId}`, { headers });

          // Assuming response.data is an array of department objects with a "name" property
          const allDepartments = response.data;
          if (userData.role === "admin") {
            // Extract department names from the response and store them in the 'departments' array
            departments_list = allDepartments.map(department => department.name);
          } else {
            // Extract department names and IDs, and store them in the 'departmentOptions' array
            departments_list = allDepartments.map(department => ({
              label: department.name,
              value: department.departmentId
            }));

            // Set selected departments based on userData.departments
            const selectedDepartments = departments_list.filter(department =>
              userData.departments.includes(department.value)
            );
            setDepartments(selectedDepartments);
          }
          setDepartmentOptions(departments_list);

        } catch (error) {
          console.error('Error fetching departments:', error);
        }
        return currentUser;
      } catch (error) {
        console.error("Error fetching data:", error.response ? error.response.data : error.message);
        return null; // Handle error and return null
      }
    };

    const fetchDataAndSetUser = async () => {
      let user = await fetchData();
      if (user) { // Check if user is not null before setting
        setUser(user);
      }
    };

    fetchDataAndSetUser(); // Call the async function
  }, [Token.token]); // Now the useEffect depends on Token.token

  const handleClick = () => {
    navigate(`/${user}/user-management`);
  };

  // Function to handle deleting a department
  const handleDeleteDepartment = (departmentToDelete) => {
    // Logic to delete department from the state and backend
    setNewDepartmentList(prevList => prevList.filter(department => department !== departmentToDelete));
    setDepartmentOptions(prevList => prevList.filter(department => department !== departmentToDelete));
    // Store the deleted department in the deletedDepartments state
    setDeletedDepartmentsList(prevDeleted => [...prevDeleted, departmentToDelete]);
  };

  const handleEditClick = () => {
    setIsEditing(true); // Enable editing mode
  };

  const handleSaveClick = async () => {
    // Add departments first
    await handleAddDepartment();

    // Change password if the fields are not empty
    if (password !== "" && passwordTemp !== "") {
      try {
        const response = await fetch(`http://127.0.0.1:8000/users_change_password/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ new_password: passwordTemp }), // Send the new password
        });

        if (!response.ok) {
          throw new Error('Failed to change password.');
        }
        console.log("Password changed successfully.");
      } catch (error) {
        console.error('Error changing password:', error);
      }
    }

    // Check for changes in email or phone
    if (emailTemp !== email || phoneTemp !== phone) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/users_profile/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailTemp,
            phone: phoneTemp,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update user information.');
        }

        const result = await response.json();
        console.log(result.message); // Show success message
      } catch (error) {
        console.error('Error updating user information:', error);
      }
    }

    if (deletedDepartmentsList.length > 0) {
      try {
        const response = await fetch('http://127.0.0.1:8000/departments/', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            departments: deletedDepartmentsList, // Send the department to delete
            company_id: companyId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete department from backend');
        }

      } catch (error) {
        console.error('Error deleting department from backend:', error);
      }
    }

    // Update departments if the user is not a company admin
    if (!isCompanyAdmin) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/users_departments/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            departments: departments.map(dept => dept.value), // Send department IDs
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update departments.');
        }

        const result = await response.json();
        console.log(result.message); // Show success message
      } catch (error) {
        console.error('Error updating departments:', error);
      }
    }

    // Save alert preferences
    try {
      const sanitizedPreferences = Object.fromEntries(
        Object.entries(alertPreferencesTemp).map(([key, value]) => [key, value === null ? false : value])
      );
    
      const response = await fetch(`http://127.0.0.1:8000/users_alert_preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedPreferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update alert preferences.');
      }

      const result = await response.json();
      console.log(result.message); // Show success message
      setAlertPreferences(alertPreferencesTemp); // Update alert preferences state
    } catch (error) {
      console.error('Error updating alert preferences:', error);
    }

    // Reset form state and exit editing mode
    setIsEditing(false); // Disable editing mode
    setNewDepartmentList([]); // Clear the department list
    setEmail(emailTemp); // Update email state
    setPhone(phoneTemp); // Update phone state
    setPassword(''); // Clear password fields
    setPasswordTemp('');
    setReconfirmPassword('');
    setDeletedDepartmentsList([]);
    setErrors({}); // Reset errors
  };

  const handleSave = async (e) => {
    const isValid = await validateForm();
    if (isValid) {
      handleSaveClick();
    }
  }

  const validateForm = async () => {
    let newErrors = {};

    // Password validation
    if (passwordTemp) {
      if (!passwordValidationSchema.isValidSync(passwordTemp)) {
        newErrors.password = "Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
      }
    }
    // Phone validation
    const phoneRegex = /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/; // Adjust this regex based on the country format
    if (!phoneTemp) {
      newErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(phoneTemp)) {
      newErrors.phone = "Invalid phone number format";
    }

    // Asynchronous  check
    setLoading(true); // Start loading while checking the email
    if (email !== emailTemp) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/user_exists/${emailTemp}`);

        if (!response.ok) {
          throw new Error('Failed to check email existence');
        }

        const emailExists = await response.json();
        if (emailExists) {
          newErrors.email = "Email already exists.";
        }
      } catch (error) {
        console.error("Error checking email existence:", error);
        newErrors.email = "Error checking email existence.";
      }
    }
    if (password !== "") {
      try {
        const response = await fetch(`http://127.0.0.1:8000/users_verify-password/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_password: password // Send the current password in the request body
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to check password');
        }

        const passwordCorrect = await response.json();
        if (!passwordCorrect) {
          newErrors.passwordCorrect = "Current password is wrong.";
        }
      } catch (error) {
        console.error("Error checking password:", error);
        newErrors.passwordCorrect = "Error checking password.";
      } finally {
        setLoading(false); // Stop loading after the async call completes
      }
    } else {
      setLoading(false);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Returns true if no errors
  }

  const handleCancelClick = () => {
    setIsEditing(false); // Disable editing mode and save changes
    setNewDepartmentList([]);
    setEmailTemp(email);
    setPhoneTemp(phone);
    setPassword('');
    setPasswordTemp('');
    setReconfirmPassword('');
    setDeletedDepartmentsList('');
    setErrors({});
    setAlertPreferencesTemp(alertPreferences); // Reset temp alert preferences
  }
  const [open, setOpen] = useState(false); // State for dialog visibility

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewDepartment('');
  };

  // Function to handle adding a new department
  const handleAddDepartment = async () => {
    if (newDepartmentList.length > 0) {
      try {
        // POST request to add department to the backend
        const response = await fetch('http://127.0.0.1:8000/departments/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ departments: newDepartmentList, company_id: companyId }), // Send the department name
        });

        if (!response.ok) {
          throw new Error('Failed to add department');
        }
        setDepartmentOptions([...departmentOptions, ...newDepartmentList]);
      } catch (error) {
        console.error('Error adding department:', error);
      }
    }
  };

  // Function to handle adding a new department (list)
  const handleAddDepartmentList = async () => {
    if (newDepartment) {
      try {
        // Check if the department already exists for the given company
        const response = await fetch(`http://127.0.0.1:8000/departments/${companyId}/${newDepartment}`);

        if (!response.ok) {
          throw new Error('Failed to check department existence');
        }

        const departmentExists = await response.json();

        if (departmentExists) {
          setErrorDeptMessage("Department already exists.")
          alert(`Department "${newDepartment}" already exists.`); // Alert user if department exists
          return; // Exit the function if the department exists
        }

        // If the department doesn't exist, add it to the newDepartmentList
        setNewDepartmentList(prevList => [
          ...prevList,
          newDepartment
        ]);

        setNewDepartment(''); // Reset input field
        setOpen(false); // Close the dialog after department is added
        handleClose(); // Close the dialog after operation

      } catch (error) {
        setErrorDeptMessage("Error occured when adding new department.")
        console.error('Error adding department:', error);
      }
    } else {
      setErrorDeptMessage("Please enter the department name.")
    }
  };

  const handleDeleteAccountClick = () => {
    setOpenDeleteDialog(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account.');
      }

      // Clear auth token
      Auth.setAuth(false);
      Token.setToken("");
      Cookies.remove("token");

      // Redirect to login or home page after account deletion
      navigate('/Login');
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setOpenDeleteDialog(false);
    }
  };

  const handleAlertPreferenceChange = (event) => {
    setAlertPreferencesTemp({
      ...alertPreferencesTemp,
      [event.target.name]: event.target.checked, // Toggle the checked state
    });
  };

  return (
    <Grid container spacing={2} sx={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Avatar and Username Section */}
      <Grid item xs={12} align="center">
        <Avatar sx={{ width: 100, height: 100, bgcolor: palette.grey[500], fontSize: '3rem' }}>
          {user.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="h4" sx={{ fontWeight: 'bold', marginTop: 2 }}>
          {user}
        </Typography>
        <Typography variant="h6" sx={{ color: palette.grey[500] }}>
          @{user.toLowerCase().replace(' ', '')}
        </Typography>
      </Grid>

      {/* Profile Info */}
      <Grid item xs={6}>
        <Box
          sx={{
            display: 'flex',          // Use flexbox
            flexDirection: 'column',  // Align items in a column
            justifyContent: 'center',  // Center vertically
            height: '100%',           // Set the height of the Box
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
            Email
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <CustomTextField
          value={!isEditing ? email : emailTemp}
          fullWidth
          onChange={(e) => setEmailTemp(e.target.value)}
          sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
          disabled={!isEditing} // Enable/disable based on editing mode
          error={!!errors.email}
          helperText={errors.email}
        />
      </Grid>

      <Grid item xs={6}>
        <Box
          sx={{
            display: 'flex',          // Use flexbox
            flexDirection: 'column',  // Align items in a column
            justifyContent: 'center',  // Center vertically
            height: '100%',           // Set the height of the Box
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
            Username
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <CustomTextField
          value={user}
          fullWidth
          sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
          disabled
        />
      </Grid>

      <Grid item xs={6}>
        <Box
          sx={{
            display: 'flex',          // Use flexbox
            flexDirection: 'column',  // Align items in a column
            justifyContent: 'center',  // Center vertically
            height: '100%',           // Set the height of the Box
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
            Phone
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <CustomTextField
          value={!isEditing ? phone : phoneTemp}
          onChange={(e) => setPhoneTemp(e.target.value)}
          fullWidth
          error={!!errors.phone}
          helperText={errors.phone}
          sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
          disabled={!isEditing} // Enable/disable based on editing mode
        />
      </Grid>

      <Grid item xs={6}>
        <Box
          sx={{
            display: 'flex',          // Use flexbox
            flexDirection: 'column',  // Align items in a column
            justifyContent: 'center',  // Center vertically
            height: '100%',           // Set the height of the Box
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
            Account Type
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <CustomTextField
          value={accountType}
          disabled
          fullWidth
          sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
        />
      </Grid>

      {accountType === 'company' && (
        <>
          <Grid item xs={6}>
            <Box
              sx={{
                display: 'flex',          // Use flexbox
                flexDirection: 'column',  // Align items in a column
                justifyContent: 'center',  // Center vertically
                height: '100%',           // Set the height of the Box
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
                Company
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <CustomTextField
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              fullWidth
              sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
              disabled // Enable/disable based on editing mode
            />
          </Grid>

          <Grid item xs={6}>
            <Box
              sx={{
                display: 'flex',          // Use flexbox
                flexDirection: 'column',  // Align items in a column
                justifyContent: 'center',  // Center vertically
                height: '100%',           // Set the height of the Box
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
                Departments
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            {!isCompanyAdmin ? (
              // When not a company admin, show the SearchableSelect component for multiple selections
              <SearchableSelectDepartments
                multiple
                onChange={(e, newValue) => {setDepartments(newValue)}}
                options={departmentOptions}
                isMulti // Enable multiple selections
                sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
                margin="normal"
                fullWidth
                value={departments}
                disabled={!isEditing} // Enable/disable based on editing mode
              />
            ) : isEditing ? (
              // When editing, show the button to add a new department
              <>
                <Box>
                  {(departmentOptions.length > 0 || newDepartmentList.length > 0) ? (
                    [...departmentOptions, ...newDepartmentList].map((department, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteDepartment(department)}
                          sx={{ borderRadius: '50%', padding: '0.2rem', marginRight: '0.5rem' }} // Adjust padding and margin as needed
                        >
                          <DeleteIcon fontSize="medium" sx={{ backgroundColor: palette.grey[500] }} />
                        </IconButton>
                        <Typography sx={{ color: palette.grey[500], margin: '4px 0' }}>
                          {department}
                        </Typography>
                      </div>
                    ))
                  ) : (
                    <CustomTextField
                      label="No departments available"
                      fullWidth
                      InputLabelProps={{ style: { color: palette.grey[500] } }}
                      sx={{ input: { color: palette.grey[500], fontSize: '1rem' }, marginTop: '10px' }} // Add some margin for better appearance
                      disabled={true}
                    />
                  )}

                </Box>
                <Button
                  onClick={handleOpen}
                  variant='outlined'
                  sx={{ marginLeft: '10px', color: palette.primary.main }}
                >
                  Add New Department
                </Button>
                <Dialog open={open} onClose={handleClose}>
                  <DialogTitle id="add-department-title" sx={{ backgroundColor: 'background.default', color: palette.grey.main }}>
                    Add New Department
                  </DialogTitle>
                  <DialogContent sx={{ backgroundColor: 'background.default', color: palette.grey.main }}>
                    <CustomTextField
                      required
                      margin="normal"
                      label="Department Name"
                      fullWidth
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
                      InputLabelProps={{ style: { color: palette.grey[500] } }}
                      error={!!errorDeptMessage} // Set error prop based on errorMessage state
                      helperText={errorDeptMessage} // Display error message as helper text
                    />
                  </DialogContent>
                  <DialogActions sx={{ backgroundColor: 'background.default', color: palette.grey.main }}>
                    <Button onClick={handleClose} color="secondary">
                      Cancel
                    </Button>
                    <Button onClick={handleAddDepartmentList} variant='contained' color="primary">
                      Add
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            ) : (
              // When not editing, display the list of departments
              <Box>
                {(departmentOptions.length > 0 || newDepartmentList.length > 0) ? (
                  [...departmentOptions, ...newDepartmentList].map((department, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                      <Typography sx={{ color: palette.grey[500], margin: '4px 0' }}>
                        {department}
                      </Typography>
                    </div>
                  ))
                ) : (
                  <CustomTextField
                    label="No departments available"
                    fullWidth
                    InputLabelProps={{ style: { color: palette.grey[500] } }}
                    sx={{ input: { color: palette.grey[500], fontSize: '1rem' }, marginTop: '10px' }} // Add some margin for better appearance
                    disabled={true}
                  />
                )}

              </Box>
            )}

          </Grid>
        </>
      )}

      {/* Alert Preferences */}
      <Grid item xs={6}>
        <Box
          sx={{
            display: 'flex',          // Use flexbox
            flexDirection: 'column',  // Align items in a column
            justifyContent: 'center',  // Center vertically
            height: '100%',           // Set the height of the Box
          }}
        >
          <Typography variant="h4" fontWeight="bold">Alert Preferences</Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={alertPreferencesTemp.emailNotifications}
              onChange={handleAlertPreferenceChange}
              name="emailNotifications"
              disabled={!isEditing} // Disable when not in edit mode
              sx={{
                color: palette.grey[500], // Default checkbox color
                '&.Mui-checked': {
                  color: palette.primary.main, // Color when checked
                },
                '&.Mui-disabled': {
                  color: palette.grey[500], // Color for the disabled state
                },
                '&.Mui-disabled.Mui-checked': {
                  color: palette.primary.main, // Keep checked color if also disabled
                }
              }}
            />
          }
          label={
            <Typography sx={{ color: palette.grey[500] }}>Email Notifications</Typography>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={alertPreferencesTemp.smsNotifications}
              onChange={handleAlertPreferenceChange}
              name="smsNotifications"
              disabled={!isEditing} // Disable when not in edit mode
              sx={{
                color: palette.grey[500],
                '&.Mui-checked': {
                  color: palette.primary.main,
                },
                '&.Mui-disabled': {
                  color: palette.grey[500], // Color for the disabled state
                },
                '&.Mui-disabled.Mui-checked': {
                  color: palette.primary.main, // Keep checked color if also disabled
                }
              }}
            />
          }
          label={
            <Typography sx={{ color: palette.grey[500] }}>SMS Notifications</Typography>
          }
        />
      </Grid>

      {isCompanyAdmin && !isEditing && (
        <>
          <Grid item xs={6}>
            <Box
              sx={{
                display: 'flex',          // Use flexbox
                flexDirection: 'column',  // Align items in a column
                justifyContent: 'center',  // Center vertically
                height: '100%',           // Set the height of the Box
              }}
            >
              <Typography variant="h4" fontWeight="bold">Company Admin Actions</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Button onClick={handleClick} variant="outlined">
              Manage Users
            </Button>
          </Grid>
        </>
      )}
      {/* Change Password Section */}
      {!isEditing ? (
        <></>
      ) : (
        <>
          <Grid item xs={6}>
            <Box
              sx={{
                display: 'flex',          // Use flexbox
                flexDirection: 'column',  // Align items in a column
                justifyContent: 'center',  // Center vertically
                height: '100%',           // Set the height of the Box
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
                Current Password (Leave blank if not changing password)
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <CustomTextField
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              disabled={!isEditing} // Enable/disable based on editing mode
              fullWidth
              error={!!errors.passwordCorrect}
              helperText={errors.passwordCorrect}
              type='password'
              sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
            />
          </Grid>
          <Grid item xs={6}>
            <Box
              sx={{
                display: 'flex',          // Use flexbox
                flexDirection: 'column',  // Align items in a column
                justifyContent: 'center',  // Center vertically
                height: '100%',           // Set the height of the Box
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
                New Password (Leave blank if not changing password)
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <CustomTextField
              onChange={(e) => setPasswordTemp(e.target.value)}
              value={passwordTemp}
              disabled={!isEditing} // Enable/disable based on editing mode
              fullWidth
              type='password'
              error={!!errors.password}
              helperText={errors.password}
              sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
            />
          </Grid>
          <Grid item xs={6}>
            <Box
              sx={{
                display: 'flex',          // Use flexbox
                flexDirection: 'column',  // Align items in a column
                justifyContent: 'center',  // Center vertically
                height: '100%',           // Set the height of the Box
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.grey[500] }}>
                Reconfirm Password (Leave blank if not changing password)
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <CustomTextField
              value={reconfirmPassword}
              error={reconfirmPassword !== passwordTemp}
              helperText={((reconfirmPassword !== passwordTemp)
                ? "Passwords do not match"
                : "")}
              onChange={(e) => setReconfirmPassword(e.target.value)}
              disabled={!isEditing} // Enable/disable based on editing mode
              fullWidth
              sx={{ input: { color: palette.grey[500], fontSize: '1rem' } }}
            />
          </Grid>
        </>
      )}
      {/* Edit/Save Button */}
      <Grid item xs={12} align="center">
        {!isEditing ? (
          <Button onClick={handleEditClick} variant="contained" color="primary">
            Edit Profile
          </Button>
        ) : (
          <>
            <Button onClick={handleSave} disabled={loading} variant="contained" color="secondary">
              {loading ? "Validating..." : "Save Changes"}
            </Button>
            <Button onClick={handleCancelClick} color="secondary" sx={{ marginLeft: "15px" }}>
              Cancel
            </Button>
          </>
        )}
      </Grid>

      {/* Delete Account */}
      <Grid item xs={12}>
        <Button color="secondary" fullWidth onClick={handleDeleteAccountClick}>
          Delete Account
        </Button>
      </Grid>
      {/* Confirmation Dialog for Deletion */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        aria-labelledby="confirm-deletion-title"
        aria-describedby="confirm-deletion-description"
      >
        <DialogTitle id="confirm-deletion-title" sx={{ backgroundColor: 'background.default' }}>Confirm Deletion</DialogTitle>
        <DialogContent sx={{ backgroundColor: 'background.default' }}>
          <DialogContentText id="confirm-deletion-description">
            <Typography variant="h5" color={palette.grey[300]}>Are you sure you want to delete your account?</Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: 'background.default' }}>
          <Button onClick={() => setOpenDeleteDialog(false)} color="secondary">No</Button>
          <Button onClick={handleDelete} color="primary">Yes</Button>
        </DialogActions>
      </Dialog>

    </Grid>
  );
};

export default Settings;