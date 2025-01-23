import DashboardBox from "./DashboardBox";
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import ImageIcon from '@mui/icons-material/Image';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useTheme } from "@emotion/react";
import { useState } from "react";
import axios from "axios";


const SourceBox = ({ source, user, setSources, departmentIdToName }) => {
  const navigate = useNavigate();
  const { palette } = useTheme();
  const [hover, setHover] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', description: '', action: null });

  const handleClick = () => {
    console.log("Clicking Navigate Button")
    navigate(`/${user}/Dashboard/${source.sourceId}`);
  };

  const handleDelete = async () => {
    console.log("Clicking Delete Button")
    try {
      if (source.sourceType === "Local Video" && source.megaFile) {
        const megaResponse = await fetch(`http://127.0.0.1:8000/delete-from-mega/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: source.megaFile.split(",")[0], sourceName: source.megaFile.split(",")[1] }),
        });
        if (!megaResponse.ok) {
          console.log('Failed to delete source');
        }
      }
    } catch (error) {
      console.error('Error deleting source:', error);
    }
    try{
      const response = await fetch(`http://127.0.0.1:8000/delete-source/${source.sourceId}`, {
        method: 'DELETE',
      });

      await axios.delete('http://127.0.0.1:8000/delete_reader/', {
        data: { source_id: source.sourceId }
      });

      if (!response.ok) {
        throw new Error('Failed to delete source');
      }
    } catch (error) {
      console.error('Error deleting source:', error);
    }
    setSources((prevSources) => prevSources.filter(s => s.sourceId !== source.sourceId));
    window.location.reload();
  };

  const handleStop = async () => {
    try {
      if (source.sourceType === "Local Video" && source.megaFile) {
        const megaResponse = await fetch(`http://127.0.0.1:8000/delete-from-mega/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: source.megaFile.split(",")[0], sourceName: source.megaFile.split(",")[1] }),
        });
        if (!megaResponse.ok) {
          throw new Error('Failed to delete source');
        }
      }
    } catch (error) {
      console.error('Error stopping source:', error);
    }

    try {
      await axios.delete('http://127.0.0.1:8000/delete_reader/', {
        data: { source_id: source.sourceId }
      });
    } catch (error) {
      console.error('Error stopping source:', error);
    }

    try {
      // Update the source status in database
      await axios.post('http://127.0.0.1:8000/update_source_status', {
        source_id: source.sourceId,
        status: 'stop'
      });
    } catch (error) {
      console.error('Error stopping source:', error);
    }

    // Update the source status in UI
    // setSources(prev => ({ ...prev, status: 'stop' }));
    // Update the source status in UI
    setSources(prevSources => prevSources.map(s => s.sourceId === source.sourceId ? { ...s, status: 'stop' } : s));
    window.location.reload();
  };

  const handlePause = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/pause_reader/${source.sourceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error pausing source:', error);
    }

    try {
      await axios.post('http://127.0.0.1:8000/update_source_status', {
        source_id: source.sourceId,
        status: 'paused'
      });
    } catch (error) {
      console.error('Error pausing source:', error);
    }

    // Update the source status in UI
    // setSources(prev => ({ ...prev, status: 'paused' }));
    setSources(prevSources => prevSources.map(s => s.sourceId === source.sourceId ? { ...s, status: 'paused' } : s));
    window.location.reload();
  };

  const handleActivate = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/resume_reader/${source.sourceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update the source status in database
      await axios.post('http://127.0.0.1:8000/update_source_status', {
        source_id: source.sourceId,
        status: 'active'
      });

      // Update the source status in UI
      // setSources(prev => ({ ...prev, status: 'active' }));
      setSources(prevSources => prevSources.map(s => s.sourceId === source.sourceId ? { ...s, status: 'active' } : s));
    } catch (error) {
      console.error('Error activating source:', error);
    }
    window.location.reload();
  };

  const handleOpenDialog = (title, description, action) => {
    setDialogContent({ title, description, action });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmAction = async () => {
    if (dialogContent.action) {
      await dialogContent.action();
    }
    setOpenDialog(false);
  };

  return (
    <DashboardBox
      onClick={handleClick}
      style={{ cursor: 'pointer', position: 'relative' }}
    >
      {source?.rois[0]?.roiImage ? (
        <img src={source?.rois[0].roiImage} style={{ width: '100%', borderRadius: '1rem' }} />
      ) : (
        <ImageIcon style={{ fontSize: 80 }} />  // Default icon
      )}
      <div style={{ display: "flex", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{source.sourceName}</h3>

        <div
          style={{
            marginLeft: "10px", // Space between h3 and status
            color: source.status === "active"
              ? palette.primary.main
              : source.status === "paused"
                ? palette.secondary.main
                : palette.tertiary.main, // Replace with actual tertiary color
            textTransform: "uppercase",
            padding: "2px 6px", // Padding for the outline effect
            border: `1px solid ${source.status === "active"
              ? palette.primary.main
              : source.status === "paused"
                ? palette.secondary.main
                : palette.tertiary.main}`, // Outline color based on status
            borderRadius: "4px", // Optional, for rounded outline
          }}
        >
          {source.status}
        </div>
      </div>

      <p style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', maxWidth: '100%' }}><strong>Type:</strong> {source.sourceType}</p>
      <p style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', maxWidth: '100%' }}><strong>Belong Type:</strong> {source.belongType}</p>
      <p style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', maxWidth: '100%' }}><strong>File Path:</strong> {source.sourcePath}</p>
      {source.visibleToDepartments && source.visibleToDepartments.length > 0 && departmentIdToName && (
        <p style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', maxWidth: '100%' }}><strong>Visible to Departments:</strong>  {source.visibleToDepartments.map(departmentId => departmentIdToName[departmentId] || departmentId).join(", ")}</p>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        {source.status === 'active' && (
          <>
            <Button
              onMouseEnter={() => setHover('pause')}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('Confirm Pause', `Are you sure you want to pause source ${source.sourceId}?`, handlePause);
              }}
              sx={{
                backgroundColor: hover === 'pause' ? palette.primary.main : 'transparent',
                color: hover === 'pause' ? palette.grey[300] : palette.primary.main,
                border: `2px solid ${palette.primary.main}`,
                transition: 'background-color 0.3s, color 0.3s',
                margin: '0 8px',
              }}
            >
              Pause
            </Button>
            {/* <Button
              onMouseEnter={() => setHover('stop')}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('Confirm Stop', `Are you sure you want to stop source ${source.sourceId}?`, handleStop);
              }}
              sx={{
                backgroundColor: hover === 'stop' ? palette.secondary.main : 'transparent',
                color: hover === 'stop' ? palette.grey[300] : palette.secondary.main,
                border: `2px solid ${palette.secondary.main}`,
                transition: 'background-color 0.3s, color 0.3s',
                margin: '0 8px',
              }}
            >
              Stop
            </Button>
            <Button
              onMouseEnter={() => setHover('delete')}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('Confirm Deletion', `Are you sure you want to delete source ${source.sourceId}?`, handleDelete);
              }}
              sx={{
                backgroundColor: palette.secondary.main,
                color: hover === 'delete' ? palette.grey[300] : palette.grey[800],
                border: `2px solid ${palette.secondary.main}`,
                transition: 'background-color 0.3s, color 0.3s',
                margin: '0 8px',
              }}
            >
              Delete
            </Button> */}
          </>
        )}
        {source.status === 'paused' && (
          <>
            <Button
              onMouseEnter={() => setHover('activate')}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('Confirm Activation', `Are you sure you want to activate source ${source.sourceId}?`, handleActivate);
              }}
              sx={{
                backgroundColor: hover === 'activate' ? palette.primary.main : 'transparent',
                color: hover === 'activate' ? palette.grey[300] : palette.primary.main,
                border: `2px solid ${palette.primary.main}`,
                transition: 'background-color 0.3s, color 0.3s',
                margin: '0 8px',
              }}
            >
              Activate
            </Button>
            <Button
              onMouseEnter={() => setHover('stop')}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('Confirm Stop', `Are you sure you want to stop source ${source.sourceId}?`, handleStop);
              }}
              sx={{
                backgroundColor: hover === 'stop' ? palette.secondary.main : 'transparent',
                color: hover === 'stop' ? palette.grey[300] : palette.secondary.main,
                border: `2px solid ${palette.secondary.main}`,
                transition: 'background-color 0.3s, color 0.3s',
                margin: '0 8px',
              }}
            >
              Stop
            </Button>
            <Button
              onMouseEnter={() => setHover('delete')}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('Confirm Deletion', `Are you sure you want to delete source ${source.sourceId}?`, handleDelete);
              }}
              sx={{
                backgroundColor: palette.secondary.main,
                color: hover === 'delete' ? palette.grey[300] : palette.grey[800],
                border: `2px solid ${palette.secondary.main}`,
                transition: 'background-color 0.3s, color 0.3s',
                margin: '0 8px',
              }}
            >
              Delete
            </Button>
          </>
        )}
        {source.status !== 'active' && source.status !== 'paused' && (
          <Button
            onMouseEnter={() => setHover('delete')}
            onMouseLeave={() => setHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDialog('Confirm Deletion', `Are you sure you want to delete source ${source.sourceId}?`, handleDelete);
            }}
            sx={{
              backgroundColor: palette.secondary.main,
              color: hover === 'delete' ? palette.grey[300] : palette.grey[800],
              border: `2px solid ${palette.secondary.main}`,
              transition: 'background-color 0.3s, color 0.3s',
              margin: '0 8px',
            }}
          >
            Delete
          </Button>
        )}
      </div>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title" sx={{ backgroundColor: 'background.default', color: palette.grey.main }}>{dialogContent.title}</DialogTitle>
        <DialogContent sx={{ backgroundColor: 'background.default' }}>
          <DialogContentText id="confirm-dialog-description" sx={{ color: palette.grey.main }}>
            {dialogContent.description}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: 'background.default' }}>
          <Button onClick={(e) => { e.stopPropagation(); handleCloseDialog(); }}>No</Button>
          <Button onClick={(e) => { e.stopPropagation(); handleConfirmAction(); }} color="primary">Yes</Button>
        </DialogActions>
      </Dialog>
    </DashboardBox>
  )
};

SourceBox.propTypes = {
  source: PropTypes.shape({
    sourceId: PropTypes.string.isRequired,
    sourceName: PropTypes.string.isRequired,
    sourceType: PropTypes.string.isRequired,
    belongType: PropTypes.string.isRequired,
    sourcePath: PropTypes.string.isRequired,
    megaFile: PropTypes.string,
    visibleToDepartments: PropTypes.array,
    rois: PropTypes.arrayOf(
      PropTypes.shape({
        readings: PropTypes.arrayOf(
          PropTypes.shape({
            imageData: PropTypes.string
          })
        ),
        roiImage: PropTypes.string
      })
    ),
    status: PropTypes.string
  }).isRequired,
  user: PropTypes.string.isRequired,
  setSources: PropTypes.func.isRequired,
  departmentIdToName: PropTypes.object
};

export default SourceBox;