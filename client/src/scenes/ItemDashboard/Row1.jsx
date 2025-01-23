import { useState, useEffect, useRef  } from 'react';
import { Box, Typography } from '@mui/material';
import DashboardBox from "@/components/DashboardBox";
import Carousel from 'react-material-ui-carousel';
import ImageIcon from '@mui/icons-material/Image';
import { Paper } from '@mui/material';
import { useTheme } from '@emotion/react';
import PropTypes from 'prop-types';  // Import PropTypes


const Row1 = ({ rois, onRoiIndexSelect, selectedRoiIndex }) => {
  const { palette } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleRoiChange = (index) => {
    onRoiIndexSelect(index);
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
        console.log("Container size updated:", containerRef.current.offsetWidth,", ", containerRef.current.offsetHeight); // Debug log
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup observer on component unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  let latestReading = null;
  if (rois && rois.length > 0 && rois[selectedRoiIndex] && rois[selectedRoiIndex].readings && rois[selectedRoiIndex].readings.length > 0) {
    latestReading = rois[selectedRoiIndex].readings[rois[selectedRoiIndex].readings.length - 1]; // Latest reading
  }

  return (
    <>
      {/* ROI Image section */}
      <DashboardBox gridArea="a" ref={containerRef}>
        {latestReading ? (
          <Carousel
            sx={{ width: "100%", height: "100%"}}
            autoPlay={false}
            index={selectedRoiIndex}
            indicators={true} // Show dots below the carousel
            navButtonsAlwaysVisible={true} // Always show navigation buttons
            onChange={(index) => handleRoiChange(index)}
          >
            {rois.map((roi, index) => {
              const latestImage =
                roi.readings[roi.readings.length - 1]?.readingImage;
              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    width:  `${containerSize.width - 40}px`,
                    height: `${containerSize.height - 40}px`
                  }}
                >
                  {latestImage ? (
                    <img
                      src={latestImage}
                      alt={`ROI ${index + 1}`}
                      style={{
                        height: "auto",
                        width: "auto",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain", // Maintain image aspect ratio
                      }}
                      onError={handleImageError}
                    />
                  ) : (
                    <ImageIcon
                      sx={{ fontSize: "8rem", color: "grey.500" }}
                      aria-label="Image not available"
                    />
                  )}
                </Box>
              );
            })}
          </Carousel>
        ) : (
          <Typography
            variant="h4"
            sx={{
              color: (theme) => theme.palette.grey[500],
              textAlign: "center",
              padding: "20px",
            }}
          >
            No Regions of Interest (ROIs) available.
          </Typography>
        )}
      </DashboardBox >

      {/* Predicted Reading section */}
      < DashboardBox gridArea="b" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }
      }>
        {
          latestReading ? (
            <Paper
              elevation={3}
              sx={{
                boxShadow: 'none',
                backgroundColor: palette.background.light,
                padding: '20px',
                borderRadius: '8px',
                width: '100%',
              }}
            >
              <Typography variant="h3" sx={{ mb: 1 }}>
                Predicted Reading
              </Typography>
              <Box sx={{ borderBottom: '1px solid', mb: 2, color: palette.grey[500] }}></Box>
              <Typography variant="body1" sx={{ fontSize: '16px', mb: 1, color: palette.grey[500] }}>
                <strong>Timestamp:</strong> {new Date(latestReading.timestamp).toLocaleString()}
              </Typography>
              <Typography variant="body1" sx={{ fontSize: '16px', mb: 1, color: palette.grey[500] }}>
                <strong>Value:</strong> {latestReading.value}
                {/* {latestReading.unit} */}
              </Typography>
              <Typography variant="body1" sx={{ fontSize: '16px', color: palette.grey[500] }}>
                <strong>Unit:</strong> {latestReading.unit}
              </Typography>
            </Paper >
          ) : (
            <Typography variant="h4" sx={{ color: palette.grey[500], textAlign: 'center' }}>
              No predicted readings available.
            </Typography>
          )}
      </DashboardBox >
    </>
  );
};

Row1.propTypes = {
  rois: PropTypes.array,
  onRoiIndexSelect: PropTypes.func,
  selectedRoiIndex: PropTypes.number,
};

export default Row1;
