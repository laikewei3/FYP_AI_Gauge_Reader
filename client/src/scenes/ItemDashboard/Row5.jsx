import { useEffect, useState } from 'react';
import DashboardBox from "@/components/DashboardBox";
import SearchableSelectDepartments from "@/components/SearchableSelectDepartments";
import axios from 'axios';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import { set } from 'date-fns';

const Row5 = ({ users, selectedUsers, setSelectedUsers, sourceId  }) => {
  console.log("Row5 selects users:", users);
  console.log("Row5 selectedUsers:", selectedUsers);
  const [selectedUsersTemp, setSelectedUsersTemp] = useState(selectedUsers);
  const [isEditing, setIsEditing] = useState(false); // Toggle between editing and saving

  const handleSelectAll = () => {
    setSelectedUsersTemp(users);
  };

  const handleCancelSelection = () => {
    setSelectedUsersTemp([]);
  };

  const handleUserChange = (event, newValue) => {
    setSelectedUsersTemp(newValue);
  };

  const handleUpdateUsers = async () => {
    setSelectedUsers(selectedUsersTemp);
    try {
      const userIds = selectedUsersTemp.map(user => user.value);
      console.log("userIds:", userIds);
      await axios.put(`http://127.0.0.1:8000/update_alert_users/${sourceId}`, {
        alertUsers: userIds
      });
    } catch (error) {
      console.error('Error updating alert users:', error);
    }
    setIsEditing(false); // Exit edit mode after saving
  };

  const toggleEdit = () => {
    setSelectedUsersTemp(selectedUsers);
    setIsEditing(!isEditing);
  };

  return (
    <DashboardBox gridArea="g" sx={{ overflow: 'auto' }}>
      <div style={{ marginBottom: '1rem' }}>Please select users to alert:</div>
      {isEditing && (
        <>
          <Button variant="contained" color="primary" onClick={handleSelectAll} style={{ marginBottom: '1rem', marginRight: '1rem' }}>
            Select All
          </Button>
          <Button variant="contained" color="secondary" onClick={handleCancelSelection} style={{ marginBottom: '1rem' }}>
            Cancel Selection
          </Button>
        </>
      )}
      <SearchableSelectDepartments
        multiple
        options={users}
        value={isEditing ? selectedUsersTemp : selectedUsers}
        onChange={handleUserChange}
        label="Select Users to Alert"
        placeholder="Users"
        sx={{ 
          input: { color: 'grey', fontSize: '1rem' },
          '& .MuiInputLabel-root': { color: 'grey' }
        }}
        margin="normal"
        fullWidth
        disabled={!isEditing} // Disable input when not in edit mode
      />
      <Button variant="outlined" color={isEditing ? "secondary" : "primary"} onClick={isEditing ? handleUpdateUsers : toggleEdit} style={{ marginTop: '1rem', width: '100%' }}>
        {isEditing ? "Save" : "Edit"}
      </Button>
    </DashboardBox>
  );
};

Row5.propTypes = {
  users: PropTypes.array.isRequired,
  selectedUsers: PropTypes.array.isRequired,
  setSelectedUsers: PropTypes.func.isRequired,
  sourceId: PropTypes.string.isRequired,
};

export default Row5;