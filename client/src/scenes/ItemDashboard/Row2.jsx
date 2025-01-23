import DashboardBox from "@/components/DashboardBox";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import PropTypes from "prop-types";
import { useTheme } from "@emotion/react";
import zoomPlugin from "chartjs-plugin-zoom";
import { useState, useEffect, useRef } from "react";
import { Typography } from "@mui/material";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

const Row2 = ({ readings }) => {
  const { palette } = useTheme();
  const chartRef = useRef(null); // Create a ref for the chart

  // State to hold the current display data
  const [displayData, setDisplayData] = useState({ labels: [], data: [] });
  const [dataCount, setDataCount] = useState(10); // Initial number of data points to show

  // Prepare data on mount or when ROI index or dataCount changes
  useEffect(() => {
    if (readings && readings.length > 0) {
      const latestData = readings.slice(-dataCount); // Get the latest data points
      const labels = latestData.map((reading) => {
        const date = new Date(reading.timestamp);
        const formattedDate = date.toLocaleString();
        const parts = formattedDate.split(","); // Split the formatted string by comma
        return parts.length > 1 ? [parts[0], parts[1]] : [formattedDate]; // Return as array for multiple lines
      });
      const data = latestData.map((reading) => reading.value);

      setDisplayData({ labels, data });
    } else {
      setDisplayData({ labels: [], data: [] }); // Reset display data when no valid ROI or readings
    }
  }, [readings, dataCount]); // Update effect dependencies to include dataCount

  // Chart data
  const chartData = {
    labels: displayData.labels,
    datasets: [
      {
        data: displayData.data,
        fill: false,
        backgroundColor: palette.primary.main,
        borderColor: palette.primary.main,
        tension: 0.1,
      },
    ],
  };

  // Chart options
  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Time",
          color: palette.grey.main,
          font: {
            weight: "bold", // Make the x-axis title bold
          },
        },
        grid: {
          display: true,
          color: palette.grey[800],
          lineWidth: 1,
        },
        ticks: {
          color: palette.grey.main,
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        title: {
          display: true,
          text: "Value",
          color: palette.grey.main,
          font: {
            weight: "bold", // Make the y-axis title bold
          },
        },
        grid: {
          display: true,
          color: palette.grey[800],
          lineWidth: 1,
        },
        ticks: {
          color: palette.grey.main,
        },
      },
    },
  };

  // Zoom in and zoom out functions
  const handleZoomIn = () => {
    setDataCount((prevCount) => Math.max(prevCount - 1, 1)); // Decrease data points but not less than 1
  };

  const handleZoomOut = () => {
    setDataCount((prevCount) => prevCount + 1); // Increase data points
  };

  return (
    <DashboardBox gridArea="c" sx={{ display: "flex", justifyContent: 'center', alignItems: "center" }}>
      {readings && readings.length > 0 ? (
        <>
          {/* Zoom buttons */}
          <div style={{ display: "flex", flexDirection: "column", marginRight: "5px", zIndex: 10 }}>
            <button onClick={handleZoomIn} style={buttonStyle}>+</button>
            <button onClick={handleZoomOut} style={buttonStyle}>-</button>
          </div>
          {/* Line chart */}
          <div style={{ width: "100%", height: "100%", color: "pink" }}>
            <Line ref={chartRef} data={chartData} options={options} />
          </div>
        </>
      ) : (
        <Typography variant="h4" sx={{ color: palette.grey[500], textAlign: "center" }}>
          No readings available to display.
        </Typography>
      )}
    </DashboardBox>
  );
};

// Button style
const buttonStyle = {
  marginLeft: "5px",
  marginBottom: "5px",
  padding: "5px 10px",
  borderRadius: "4px",
  cursor: "pointer",
};

// Define PropTypes for Row2
Row2.propTypes = {
  readings: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      unit: PropTypes.string,
      // coordinates: PropTypes.shape({
      //   x: PropTypes.number,
      //   y: PropTypes.number,
      // }),
      readingImage: PropTypes.string,
    })
  ).isRequired,
};

export default Row2;