import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  CircularProgress, 
  Paper,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Grid,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import moment from 'moment';
import apiService from '../services/api';

// Status steps for the call process
const statusSteps = [
  { key: 'initiated', label: 'Call Initiated', description: 'Request sent to Bland AI' },
  { key: 'queued', label: 'Queued', description: 'Call is in queue' },
  { key: 'in_progress', label: 'In Progress', description: 'Call is currently active' },
  { key: 'completed', label: 'Completed', description: 'Call ended successfully' }
];

// Map Bland AI status to step index
const statusToStepIndex = {
  'initiated': 0,
  'queued': 1,
  'in_progress': 2,
  'completed': 3,
  'error': -1
};

const CallStatus = ({ callId, initialData }) => {
  const [callData, setCallData] = useState(initialData || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);

  // Determine current step based on call status
  useEffect(() => {
    if (callData && callData.status) {
      const stepIndex = statusToStepIndex[callData.status] || 0;
      setActiveStep(stepIndex);
    }
  }, [callData]);

  // Fetch call status at regular intervals
  useEffect(() => {
    let intervalId;

    const fetchCallStatus = async () => {
      if (!callId) return;

      setLoading(true);
      try {
        const data = await apiService.getCallStatus(callId);
        setCallData(data);
        setError(null);

        // If call is completed or has error, stop polling
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Error fetching call status:', err);
        setError('Unable to fetch call status');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchCallStatus();

    // Set up polling every 3 seconds for active calls
    intervalId = setInterval(() => {
      fetchCallStatus();
      setRefreshCount(prev => prev + 1);
    }, 3000);

    // Clean up interval on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [callId]);

  // Calculate call duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format timestamp
  const formatTime = (isoString) => {
    if (!isoString) return '';
    return moment(isoString).format('h:mm:ss A');
  };

  // Get status icon based on current status
  const getStatusIcon = () => {
    switch (callData.status) {
      case 'initiated':
        return <PhoneIcon color="primary" />;
      case 'queued':
        return <HourglassEmptyIcon color="primary" />;
      case 'in_progress':
        return <PhoneIcon color="secondary" />;
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Call Status {getStatusIcon()}
      </Typography>

      {error ? (
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : !callData || Object.keys(callData).length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {/* Status Summary */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Call ID</Typography>
                  <Typography variant="body1">{callId}</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip 
                    label={callData.status?.toUpperCase() || 'UNKNOWN'} 
                    color={
                      callData.status === 'completed' ? 'success' : 
                      callData.status === 'error' ? 'error' :
                      callData.status === 'in_progress' ? 'secondary' : 'primary'
                    }
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Invitee</Typography>
                  <Typography variant="body1">{callData.callData?.inviteeName || '-'}</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Occasion</Typography>
                  <Typography variant="body1">{callData.callData?.occasion || '-'}</Typography>
                </Grid>

                {callData.duration_seconds && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Duration</Typography>
                    <Typography variant="body1">{formatDuration(callData.duration_seconds)}</Typography>
                  </Grid>
                )}

                {callData.credits_used && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Credits Used</Typography>
                    <Typography variant="body1">{callData.credits_used}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Typography variant="subtitle1" gutterBottom>Call Progress</Typography>
          <Box sx={{ mb: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {statusSteps.map((step, index) => (
                <Step key={step.key} completed={activeStep > index}>
                  <StepLabel>{step.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Status Events Timeline */}
          <Typography variant="subtitle1" gutterBottom>Call Events</Typography>
          <Box sx={{ maxHeight: '200px', overflowY: 'auto', mb: 2 }}>
            {callData.events && callData.events.length > 0 ? (
              <Box sx={{ position: 'relative' }}>
                {callData.events.map((event, index) => (
                  <Box key={index} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                    <Box sx={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      bgcolor: 'primary.main',
                      mt: 0.8,
                      mr: 1.5,
                      position: 'relative',
                      zIndex: 1
                    }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        {formatTime(event.time)}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {event.status}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {/* Vertical timeline line */}
                <Box sx={{
                  position: 'absolute',
                  left: '6px',
                  top: '12px',
                  bottom: '0',
                  width: '2px',
                  bgcolor: 'divider',
                  zIndex: 0
                }} />
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                No events recorded yet
              </Typography>
            )}
          </Box>

          {/* Call Summary (appears only after call ends) */}
          {callData.status === 'completed' && callData.transcript && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Call Summary
              </Typography>
              <Card variant="outlined" sx={{ mb: 3, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                {callData.extracted_info && (
                  <Box sx={{ bgcolor: '#f0f7ff', p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Meeting Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="textSecondary">Email Address</Typography>
                        <Typography variant="body1" sx={{
                          fontWeight: 'medium',
                          color: callData.extracted_info.email !== 'not found' ? 'primary.main' : 'text.secondary'
                        }}>
                          {callData.extracted_info.email || 'Not provided'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="textSecondary">Scheduled Time</Typography>
                        <Typography variant="body1" sx={{
                          fontWeight: 'medium',
                          color: callData.extracted_info.scheduled_time !== 'not found' ? 'primary.main' : 'text.secondary'
                        }}>
                          {callData.extracted_info.scheduled_time || 'Not scheduled'}
                        </Typography>
                      </Grid>
                      {callData.extracted_info.confidence && (
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>Extraction confidence:</Typography>
                            <Chip 
                              size="small" 
                              label={callData.extracted_info.confidence.toUpperCase()}
                              color={
                                callData.extracted_info.confidence === 'high' ? 'success' :
                                callData.extracted_info.confidence === 'medium' ? 'primary' : 'default'
                              }
                            />
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Call Transcript
                  </Typography>
                  <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {callData.transcript.map((entry, index) => (
                      <Box key={index} sx={{ mb: 1.5, pb: 1.5, borderBottom: index < callData.transcript.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <Typography variant="subtitle2" color={entry.role === 'agent' ? 'primary' : 'secondary'} fontWeight="medium">
                          {entry.role === 'agent' ? 'AI Assistant' : 'Invitee'}:
                        </Typography>
                        <Typography variant="body2">{entry.text}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </>
          )}

          {/* Transcript for in-progress calls */}
          {callData.status !== 'completed' && callData.transcript && (
            <>
              <Typography variant="subtitle1" gutterBottom>Live Transcript</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: '200px', overflowY: 'auto', mb: 3 }}>
                {callData.transcript.map((entry, index) => (
                  <Box key={index} sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" color={entry.role === 'agent' ? 'primary' : 'secondary'}>
                      {entry.role === 'agent' ? 'AI Assistant' : 'Invitee'}:
                    </Typography>
                    <Typography variant="body2">{entry.text}</Typography>
                  </Box>
                ))}
              </Paper>
            </>
          )}

          {/* Extracted Information for in-progress calls */}
          {callData.status !== 'completed' && callData.extracted_info && (
            <>
              <Typography variant="subtitle1" gutterBottom>Extracted Meeting Details</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f9f9ff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Email Address</Typography>
                    <Typography variant="body1" sx={{
                      fontWeight: callData.extracted_info.email !== 'not found' ? 'bold' : 'normal',
                      color: callData.extracted_info.email !== 'not found' ? 'primary.main' : 'text.secondary'
                    }}>
                      {callData.extracted_info.email || 'Not provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Scheduled Time</Typography>
                    <Typography variant="body1" sx={{
                      fontWeight: callData.extracted_info.scheduled_time !== 'not found' ? 'bold' : 'normal',
                      color: callData.extracted_info.scheduled_time !== 'not found' ? 'primary.main' : 'text.secondary'
                    }}>
                      {callData.extracted_info.scheduled_time || 'Not scheduled'}
                    </Typography>
                  </Grid>
                  {callData.extracted_info.confidence && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mr: 1 }}>Confidence:</Typography>
                        <Chip 
                          size="small" 
                          label={callData.extracted_info.confidence.toUpperCase()}
                          color={
                            callData.extracted_info.confidence === 'high' ? 'success' :
                            callData.extracted_info.confidence === 'medium' ? 'primary' : 'default'
                          }
                        />
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </>
          )}

          {/* Footer showing auto-refresh status */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="caption" color="textSecondary">
              {loading ? 'Refreshing...' : `Last updated ${refreshCount > 0 ? refreshCount * 3 : 0}s ago`}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CallStatus;
