import CustomTextField from '@/components/CustomTextField';
import { Grid, Typography, Button, List, ListItem, ListItemText, Checkbox, useTheme, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { TokenApi } from "@/App";
import axios from 'axios'
import { useNavigate } from 'react-router-dom';

const UserManagement = () => {
    const { palette } = useTheme();
    const Token = useContext(TokenApi);
    const [user, setUser] = useState("");
    const [employeeData, setEmployeeData] = useState([]);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openAdminToggleDialog, setOpenAdminToggleDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [userToToggle, setUserToToggle] = useState(null);
    const [userToApprove, setUserToApprove] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('asc');
    const [departmentIdToName, setDepartmentIdToName] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            let toke = Token.token; // Get the token here

            // Check if the token is empty
            if (toke === "") {
                console.log("Token is empty, skipping fetch.");
                return null; // Return null if token is empty
            }

            // Set up headers for the request with authorization
            const headers = {
                Authorization: `Bearer ${toke}`, // Use template literals correctly
            };

            try {
                // Step 1: Fetch current user username using the token
                let res = await axios.get("http://127.0.0.1:8000/", { headers });
                const username = res.data.data; // Assuming this is the username
                console.log("Current Username:", username); // Log the current username

                // Step 2: Fetch the full user data using the username
                let userResponse = await axios.get(`http://127.0.0.1:8000/users_by_username/${username}`, { headers });
                const userData = userResponse.data; // Full user data containing companyId
                console.log("Full User Data:", userData); // Log the full user data

                // Step 3: Check if the user has a companyId and fetch all users from the same company
                if (userData.companyId) {
                    let companyUsersResponse = await axios.get(`http://127.0.0.1:8000/users_by_company/${userData.companyId}`, { headers });
                    const companyUsers = companyUsersResponse.data; // List of users in the same company
                    console.log("Users in Same Company:", companyUsers); // Log the users
                    
                    try {
                        const response = await axios.get(`http://127.0.0.1:8000/company_departments/${userData.companyId}`);
                        const departments = response.data;
                        const departmentMapping = {};
                        departments.forEach(department => {
                            departmentMapping[department.departmentId] = department.name;
                        });
                        setDepartmentIdToName(departmentMapping);
                    } catch (error) {
                        console.error('Error fetching departments:', error);
                    }
                    return { userData, companyUsers }; // Return both user data and company users
                }

                return { userData, companyUsers: [] }; // Return user data and empty company users list if no companyId
            } catch (error) {
                console.error("Error fetching data:", error.response ? error.response.data : error.message);
                return null; // Handle error and return null
            }
        };

        const fetchDataAndSetUser = async () => {
            let result = await fetchData();
            if (result) { // Check if result is not null before setting state
                setUser(result.userData); // Set the current user's data
                console.log("Set User:", result.userData);
                if (result.companyUsers.length > 0) {
                    setEmployeeData(result.companyUsers); // Set the users from the same company
                    console.log("Set Company Users:", result.companyUsers);
                }
            }
        };

        fetchDataAndSetUser(); // Call the async function
    }, [Token.token]); // Now the useEffect depends on Token.token

    // Sorting logic
    const handleSort = (key) => {
        const sortedUsers = [...employeeData].sort((a, b) => {
            // Handle undefined values
            const aValue = a[key] !== undefined ? a[key] : ""; // Treat undefined as an empty string
            const bValue = b[key] !== undefined ? b[key] : ""; // Treat undefined as an empty string

            if (sortOrder === 'asc') {
                return aValue.localeCompare(bValue);
            }
            return bValue.localeCompare(aValue);
        });
        setEmployeeData(sortedUsers);
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    };

    // Filtering logic
    const filteredUsers = employeeData.filter(user =>
        Object.keys(user).some(key =>
            user[key] != null && // Check for both null and undefined
            user[key].toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const handleDelete = async () => {
        try {
            await axios.delete(`http://127.0.0.1:8000/users/${userToDelete.id}`);
            setEmployeeData(employeeData.filter(user => user.id !== userToDelete.id));
            if (userToDelete.id === user.id) {
                navigate('/Login');
            }
            setOpenDeleteDialog(false);
        } catch (error) {
            console.error("Failed to delete user:", error);
        }
    };

    const handleToggleAdmin = async () => {
        try {
            const updatedUser = { ...userToToggle, role: userToToggle.role === "user" ? "admin" : "user" };
            await axios.put(`http://127.0.0.1:8000/users/${userToToggle.id}`, updatedUser);
            setEmployeeData(employeeData.map(user => (user.id === userToToggle.id ? updatedUser : user)));
            setOpenAdminToggleDialog(false);
        } catch (error) {
            console.error("Failed to toggle admin status:", error);
        }
    };

    const handleApprove = async (userId) => {
        try {
            const userToApprove = employeeData.find(user => user.id === userId);
            const updatedUser = { ...userToApprove, role: "user" };
            await axios.put(`http://127.0.0.1:8000/users/${userId}`, updatedUser);
            setEmployeeData(employeeData.map(user => (user.id === userId ? updatedUser : user)));
        } catch (error) {
            console.error("Failed to approve user:", error);
        }
    };

    const getDepartmentNames = (departmentIds) => {
        return departmentIds.map(departmentId => departmentIdToName[departmentId] || "-").join(", ");
    };

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="h3">Manage Users and Approve Registrations</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
                <Typography variant="h4">Pending Registrations</Typography>
                <List>
                    {employeeData
                        .filter(user => user.role == "pending")
                        .map(user => (
                            <ListItem key={user.id}>
                                <Grid container alignItems="center" justifyContent="space-between">
                                    <Grid item xs={8}>
                                        <ListItemText
                                            primary={<Typography component="span" sx={{ color: palette.grey[500], fontWeight: "bold" }}>{user.username}</Typography>}
                                            secondary={
                                                <>
                                                    <Typography component="span" sx={{ color: palette.grey[500] }}>
                                                        {`Email: ${user.email}`}
                                                    </Typography>
                                                    <br />
                                                    <Typography component="span" sx={{ color: palette.grey[500] }}>
                                                        {`Phone: ${user.phone}`}
                                                    </Typography>
                                                    <br />
                                                    <Typography component="span" sx={{ color: palette.grey[500] }}>
                                                        {`Department: ${user.departments ? getDepartmentNames(user.departments) : "-"}`}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={4} container justifyContent="flex-end">
                                        <Button onClick={() => handleApprove(user.id)} variant="contained" color="primary">
                                            Approve
                                        </Button>
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ))}
                </List>
            </Grid>

            <Grid item xs={12} md={6}>
                <Typography variant="h4">Current Users</Typography>

                {/* Search field */}
                <Grid item xs={12}>
                    <CustomTextField
                        label="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputLabelProps={{ style: { color: palette.grey[500] } }}
                        sx={{ input: { color: palette.grey[300] } }}
                        margin="normal"
                        fullWidth
                    />
                </Grid>

                {/* Sort buttons */}
                <Grid item xs={12} md={6}>
                    <Button onClick={() => handleSort('username')}>Sort by Username</Button>
                    <Button onClick={() => handleSort('phone')}>Sort by Phone</Button>
                    <Button onClick={() => handleSort('email')}>Sort by Email</Button>
                    <Button onClick={() => handleSort('department')}>Sort by Department</Button>
                </Grid>

                <List>
                    {filteredUsers
                        .filter(user => user.role !== "pending")
                        .map(user => (
                            <ListItem key={user.id}>
                                <Grid container alignItems="center" justifyContent="space-between">
                                    <Grid item xs={8}>
                                        <ListItemText
                                            primary={<Typography component="span" sx={{ color: palette.grey[500], fontWeight: "bold" }}>
                                                {user.username}
                                            </Typography>}
                                            secondary={
                                                <>
                                                    <Typography component="span" sx={{ color: palette.grey[500] }}>
                                                        {`Email: ${user.email}`}
                                                    </Typography>
                                                    <br />
                                                    <Typography component="span" sx={{ color: palette.grey[500] }}>
                                                        {`Phone: ${user.phone}`}
                                                    </Typography>
                                                    <br />
                                                    <Typography component="span" sx={{ color: palette.grey[500] }}>
                                                        {`Department: ${user.departments ? getDepartmentNames(user.departments) : "-"}`}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={4} container justifyContent="flex-end" spacing={1}>
                                        <Grid item>
                                            <Button
                                                onClick={() => {
                                                    setUserToDelete(user);
                                                    setOpenDeleteDialog(true);
                                                }}
                                                variant="outlined"
                                                color="secondary"
                                            >
                                                Delete
                                            </Button>
                                        </Grid>
                                        <Grid item>
                                            <Checkbox
                                                checked={user.role === "admin"}
                                                onChange={() => {
                                                    setUserToToggle(user);
                                                    setOpenAdminToggleDialog(true);
                                                }}
                                                color="primary"
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ))}
                </List>
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
                        <Typography variant="h5" color={palette.grey[300]}>Are you sure you want to delete {userToDelete}?</Typography>
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ backgroundColor: 'background.default' }}>
                    <Button onClick={() => setOpenDeleteDialog(false)} color="secondary">No</Button>
                    <Button onClick={handleDelete} color="primary">Yes</Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog for Admin Toggle */}
            <Dialog
                open={openAdminToggleDialog}
                onClose={() => setOpenAdminToggleDialog(false)}
                aria-labelledby="confirm-admin-toggle-title"
                aria-describedby="confirm-admin-toggle-description"
            >
                <DialogTitle id="confirm-admin-toggle-title" sx={{ backgroundColor: 'background.default' }}>Confirm Admin Status Change</DialogTitle>
                <DialogContent sx={{ backgroundColor: 'background.default' }}>
                    <DialogContentText id="confirm-admin-toggle-description">
                        <Typography variant="h5" color={palette.grey[300]}>Are you sure you want to change the admin status for {userToToggle?.username}?</Typography>
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ backgroundColor: 'background.default' }}>
                    <Button onClick={() => setOpenAdminToggleDialog(false)} color="secondary">No</Button>
                    <Button onClick={handleToggleAdmin} color="primary">Yes</Button>
                </DialogActions>
            </Dialog>
        </Grid>
    );
};

export default UserManagement;
