import { useContext, useEffect, useState } from 'react'
import SourceBox from "@/components/SourceBox";
import { Box, Button, Grid, Typography } from '@mui/material';
import { TokenApi } from "@/App";
import axios from 'axios'
import { useTheme } from '@emotion/react';
import AddSourceDialog from './AddSourceDialog';

const Dashboard = () => {
  const { palette } = useTheme();
  const Token = useContext(TokenApi);
  const [user, setUser] = useState("");
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [sources, setSources] = useState([]);
  const [personalSources, setPersonalSources] = useState([]);
  const [departmentSources, setDepartmentSources] = useState({});
  const [noDepartmentSources, setNoDepartmentSources] = useState([]);
  const [departmentIdtoName, setDepartmentIdtoName] = useState({});

  const getAllSources = async (x) => {
    console.log("Now user:", x)
    const userResponse = await fetch(`http://127.0.0.1:8000/users_by_username/${x}`);
    if (!userResponse.ok) {
      throw new Error('Failed to get user data');
    }
    const userData = await userResponse.json();
    setUserId(userData.id);
    setCompanyId(userData?.companyId || "");

    const sourceResponse = await fetch(`http://127.0.0.1:8000/all-sources?userId=${userData.id}&companyId=${userData?.companyId || ""}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (sourceResponse.ok) {
      const data = await sourceResponse.json();

      const response = await fetch(`http://127.0.0.1:8000/user_departments/${userData.id}`);
      if (!response.ok) {
        throw new Error('Failed to get departments');
      }

      // Parse department response
      const department_data = await response.json();
      const transformedDepartmentOptions = department_data.map(department => ({
        label: department.name,
        value: department.departmentId
      }));

      // Separate sources by belongType
      setPersonalSources(data.filter(source => source.belongType === "Personal"));
      const companyDepartmentSources = data.filter(source => source.belongType !== "Personal");

      const filteredSources = userData.role === 'admin'
        ? companyDepartmentSources
        : companyDepartmentSources.filter(source =>
          source.visibleToDepartments.length === 0 ||
          source.visibleToDepartments.some(departmentId =>
            transformedDepartmentOptions.some(department => department.value === departmentId)
          )
        );
      setSources(filteredSources); // Update sources state
      
      // Categorize company/department sources by departments in visibleToDepartments
      const departmentSourcesTemp = {};
      const noDepartmentSourcesTemp = [];
      const departmentIdToNameTemp = {};
      filteredSources.forEach(source => {
        if (source.visibleToDepartments.length === 0) {
          noDepartmentSourcesTemp.push(source);
        }
        else {
          source.visibleToDepartments.forEach(departmentId => {
            const department = transformedDepartmentOptions.find(dept => dept.value === departmentId);
            if (department) {
              const key = `${department.label} - [${departmentId}]`;
              if (!departmentSourcesTemp[key]) {
                departmentSourcesTemp[key] = [];
              }
              departmentSourcesTemp[key].push(source);
              departmentIdToNameTemp[departmentId] = key;
            }
          });
        }
      });
      setNoDepartmentSources(noDepartmentSourcesTemp);
      setDepartmentSources(departmentSourcesTemp);
      setDepartmentIdtoName(departmentIdToNameTemp);
    } else {
      console.error('Error fetching sources', sourceResponse.statusText);
    }
  };

  // Sort sources by type (this can be modified for sorting purposes)
  const sortSourcesByType = (sourcesArray) => {
    return [...sourcesArray].sort((a, b) => a.sourceType.localeCompare(b.sourceType));
  };

  const [openDialog, setOpenDialog] = useState(false);
  let toke = Token.token;
  const headers = {
    Authorization: `Bearer ${toke}`,
  };
  const getdata = async () => {
    let res = await axios
      .get("http://127.0.0.1:8000/", { headers })
      .then((response) => {
        return response.data.data;
      });
    return res;
  };

  // Using a normal function inside useEffect
  useEffect(() => {
    const fetchData = async () => {
      let x = await getdata();
      setUser(x);
      console.log(x);
      await getAllSources(x);
    };

    fetchData(); // Call the async function
  }, []); // Empty dependency array means this runs only on mount

  const handleSourceOpenDialog = () => setOpenDialog(true);
  const handleSourceCloseDialog = () => setOpenDialog(false);

  console.log("Dashboard user passed:", user)
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        {/* Main Content */}
        <Box sx={{ padding: '40px', backgroundColor: 'background.default' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" gutterBottom>Welcome to Your Gauge Reader Dashboard</Typography>
          </Box>
        </Box>
      </Grid>

      {/* Source Box Section */}
      <Grid item xs={12}>
        {/* Main Content */}
        <Box sx={{ padding: '10px', backgroundColor: 'background.default' }}>
          {/* Hero Section */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" gutterBottom>Sources</Typography>
            {/* handleAddSource */}
            <Button color="primary" variant="contained" onClick={handleSourceOpenDialog}>
              + Add Source
            </Button>
            {userId && (
              <AddSourceDialog
                user={user}
                userId={userId}
                companyId={companyId}
                open={openDialog}
                handleClose={handleSourceCloseDialog}
                setSources={setSources}
              />
            )}
          </Box>
        </Box>
      </Grid>
      {sources.length === 0 ? (
        <Grid item xs={12}>
          <Box
            sx={{
              textAlign: 'center',
              padding: '40px',
            }}
          >
            {/* Empty State Message */}
            <Typography variant="h4" sx={{ color: palette.grey[700], marginBottom: '8px' }}>
              No Sources Available ૮(˶ㅠ︿ㅠ)ა
            </Typography>
            <Typography variant="body2" sx={{ color: palette.grey[500], marginBottom: '16px' }}>
              Start by adding a new source to manage your data.
            </Typography>
          </Box>
        </Grid>
      ) : (
        <Grid item xs={12}>

          {/* Personal Sources */}
          {personalSources.length > 0 && (
            <>
              <Typography variant="h3" sx={{ color: palette.grey[500], marginBottom: '8px' }}>Personal Sources</Typography>
              <Grid container spacing={2}>
                {sortSourcesByType(personalSources).map(source => (
                  <Grid item xs={12} sm={6} md={4} key={source.sourceId} sx={{ marginBottom: "20px" }}>
                    <SourceBox source={source} user={user} setSources={setSources} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
          
          {/* Company and Department Sources */}
          {(noDepartmentSources.length > 0 || Object.keys(departmentSources).length > 0) && (
            <>
              <Typography variant="h3" sx={{ color: palette.grey[500], marginBottom: '8px' }}>Company & Department Sources</Typography>

              {noDepartmentSources.length > 0 && (
                <Grid container spacing={2} sx={{ marginBottom: "20px" }}>
                  {sortSourcesByType(noDepartmentSources).map(source => (
                    <Grid item xs={12} sm={6} md={4} key={source.sourceId}>
                      <SourceBox source={source} user={user} setSources={setSources} />
                    </Grid>
                  ))}
                </Grid>
              )}

              {Object.keys(departmentSources).map(departmentId => (
                <div key={departmentId}>
                  <Typography variant="h4" sx={{ color: palette.grey[500], marginBottom: '8px' }}>
                    Department {departmentId}
                  </Typography>
                  <Grid container spacing={2} sx={{ marginBottom: "20px" }}>
                    {sortSourcesByType(departmentSources[departmentId]).map(source => (
                      <Grid item xs={12} sm={6} md={4} key={source.sourceId}>
                        {console.log("Department ID to Name:", departmentIdtoName)}
                        <SourceBox source={source} user={user} setSources={setSources} departmentIdToName={departmentIdtoName}/>
                      </Grid>
                    ))}
                  </Grid>
                </div>
              ))}
            </>
          )}
        </Grid>
      )}
    </Grid >
  )
}

export default Dashboard;