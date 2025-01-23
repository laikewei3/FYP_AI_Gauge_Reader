import { Alert, useMediaQuery } from "@mui/material";
import { Box } from "@mui/material";
import Row1 from "./Row1";
import Row2 from "./Row2";
import Row3 from "./Row3";
import Row4 from "./Row4";
import Row5 from "./Row5";
import { useLocation, useParams } from 'react-router-dom';
import { useContext, useEffect, useState } from "react";
import { TokenApi } from "@/App";
import axios from 'axios'
import { styled } from '@mui/material/styles';


const FixedAlert = styled(Alert)(({ theme }) => ({
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "#171c21", // Custom background color
    color: theme.palette.secondary.main, // Custom color, from theme if desired
}));

const gridTemplate = `
    "a b"
    "a b"
    "a b"
    "c c"
    "c c"
    "c c"
    "d e"
    "d e"
    "f e"
    "g e"
    "g e"
`;

const gridTemplateSmall = `
"a"
"a"
"a"
"a"
"b"
"b"
"b"
"c"
"c"
"c"
"c"
"c"
"d"
"d"
"d"
"d"
"e"
"e"
"e"
"e"
"e"
"e"
"e"
"f"
"g"
"g"
`;

const ItemDashboard = () => {
    const { sourceId } = useParams();
    const [selectedRoiIndex, setSelectedRoiIndex] = useState(0);
    const [currentSource, setCurrentSource] = useState(null);
    const Token = useContext(TokenApi);

    const isAboveMediumScreen = useMediaQuery("(min-width: 800px)")
    const [user, setUser] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [readings, setReadings] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
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
        };

        fetchData(); // Call the async function
    }, []); // Empty dependency array means this runs only on mount

    useEffect(() => {
        const fetchSourceData = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/get_source/${sourceId}`);
                if (!response.data.rois || response.data.rois.length === 0) {
                    setLoading(true);
                } else {
                    setCurrentSource(response.data.rois);
                    setReadings(response.data.rois[selectedRoiIndex].readings);
                    if (response.data.belongType && response.data.belongId) {
                        let response2;
                        let usersSelection = [];
                        if (response.data.belongType === "Personal") {
                            response2 = await axios.get(`http://127.0.0.1:8000/users/${response.data.belongId}`);
                            usersSelection = [{ label: response2.data.username, value: response2.data.id }];
                        } else if (response.data.belongType === "Company") {
                            response2 = await axios.get(`http://127.0.0.1:8000/company_users/${response.data.belongId}`);
                            usersSelection = response2.data.map(user => ({ label: user.username, value: user.id }));
                        } else if (response.data.belongType === "Department") {
                            console.log("response.data.visibleToDepartments:", response.data.visibleToDepartments);
                            response2 = await fetch(`http://127.0.0.1:8000/department_users/`, {
                                method: 'POST', // Change to POST
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ companyId: response.data.belongId, departments: response.data.visibleToDepartments }), // The request payload
                            });
                            
                            if (response2.ok) {
                                const data = await response2.json();
                                usersSelection = data.map(user => ({ label: user.username, value: user.id }));
                            } else {
                                console.error("HTTP error", response2.status);
                            }
                            
                        }
                        if (response.data.alertUsers) {
                            const userDetailsPromises = response.data.alertUsers.map(userId =>
                                axios.get(`http://127.0.0.1:8000/users/${userId}`)
                            );
                            const userDetailsResponses = await Promise.all(userDetailsPromises);
                            console.log("userDetailsResponses:", userDetailsResponses);

                            const usersSelected = userDetailsResponses.map(res => ({
                                label: res.data.username,
                                value: res.data.id
                            }));
                            setSelectedUsers(usersSelected);
                        }
                        setUsers(usersSelection);
                    }

                    setLoading(false);
                }
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchSourceData();

        const interval = setInterval(() => {
            fetchSourceData();
            // fetchRoiData();
        }, 5000);

        return () => clearInterval(interval);
    }, [sourceId, selectedRoiIndex]);

    return (
        <Box width="100%" height="100%" display="grid" gap="1.5rem" mt={9}
            sx={
                isAboveMediumScreen ? {
                    gridTemplateColumns: "repeat(2, minmax(370px, 1fr))",
                    gridTemplateRows: "repeat(11, 150px)",
                    gridTemplateAreas: gridTemplate,
                } : {
                    gridAutoColumns: "1fr",
                    gridAutoRows: "2fr",
                    gridTemplateAreas: gridTemplateSmall,
                }}>
            {/* ROI Image and Predicted Reading */}
            <Row1 rois={currentSource} onRoiIndexSelect={setSelectedRoiIndex} selectedRoiIndex={selectedRoiIndex} />
            {/* Predicted Reading History Graph */}
            <Row2 readings={readings} />
            {/* Alert Table and Threshold Settings */}
            <Row3 rois={currentSource} sourceId={sourceId} selectedRoiIndex={selectedRoiIndex} />
            <Row4 readings={readings} />
            <Row5 users={users} selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers} sourceId={sourceId} />
            {/* Display error or loading message */}
            {loading && (
                <FixedAlert severity="info">
                    Trying to detect gauge....
                </FixedAlert>
            )}
            {error && (
                <FixedAlert severity="error">
                    Error: {error}
                </FixedAlert>
            )}
        </Box>
    )
}

export default ItemDashboard;