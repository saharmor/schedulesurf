import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, CircularProgress } from '@mui/material';
import './App.css';

// Import components
import ScheduleMeeting from './components/ScheduleMeeting';
import CallStatus from './components/CallStatus';
import apiService from './services/api';

function App() {
  const [loading, setLoading] = useState(false);
  const [freeSlots, setFreeSlots] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [error, setError] = useState(null);

  // Fetch free slots when component mounts
  useEffect(() => {
    fetchFreeSlots();
  }, []);

  // Function to fetch free slots from the API
  const fetchFreeSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const slots = await apiService.getFreeSlots(14); // Get free slots for next 14 days
      setFreeSlots(slots);
    } catch (err) {
      console.error('Error fetching free slots:', err);
      setError('Failed to load free slots. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle call placement
  const handlePlaceCall = async (callData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.placeCall(callData);
      setActiveCall({
        ...response,
        callData,
      });
      return response;
    } catch (err) {
      console.error('Error placing call:', err);
      setError('Failed to place call. Please check your inputs and try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            AI Meeting Scheduler
          </Typography>
          <Typography variant="h6" align="center" color="textSecondary" paragraph>
            Let AI call and schedule meetings for you
          </Typography>
          
          {error && (
            <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: '#ffebee' }}>
              <Typography color="error">{error}</Typography>
            </Paper>
          )}

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            {/* Left side: Schedule form */}
            <Box sx={{ flex: 1 }}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <ScheduleMeeting 
                  onPlaceCall={handlePlaceCall} 
                  freeSlots={freeSlots} 
                  loading={loading} 
                  onRefreshSlots={fetchFreeSlots}
                />
              </Paper>
            </Box>

            {/* Right side: Call status */}
            <Box sx={{ flex: 1 }}>
              <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                {activeCall ? (
                  <CallStatus callId={activeCall.call_id} initialData={activeCall} />
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      Place a call to see status here
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        </Box>
      </Container>
    </div>
  );
}

export default App;
