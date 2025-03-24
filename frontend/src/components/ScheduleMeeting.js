import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  TextField, 
  Button, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  FormHelperText,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import moment from 'moment';

const occasionOptions = ['Coffee', 'Lunch', 'Dinner', 'Meeting', 'Interview', 'Call'];
const durationOptions = ['30 minutes', '45 minutes', '1 hour', '1.5 hours', '2 hours'];

const ScheduleMeeting = ({ onPlaceCall, freeSlots, loading, onRefreshSlots }) => {
  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [occasion, setOccasion] = useState('Coffee');
  const [duration, setDuration] = useState('30 minutes');
  const [selectedSlots, setSelectedSlots] = useState([]);
  
  // Validation state
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Get local timezone
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Reset success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);
  
  // Validate phone number format
  const validatePhoneNumber = (number) => {
    // Basic validation for international phone number
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(number);
  };
  
  // Format slot for display
  const formatSlot = (slot) => {
    const start = moment(slot.start);
    const end = moment(slot.end);
    
    return {
      id: `${slot.start}-${slot.end}`,
      label: `${start.format('ddd, MMM D')} (${start.format('h:mm A')} - ${end.format('h:mm A')})`,
      start: slot.start,
      end: slot.end
    };
  };
  
  // Handle slot selection
  const handleSlotSelect = (formatted) => {
    if (selectedSlots.find(s => s.id === formatted.id)) {
      // If already selected, remove it
      setSelectedSlots(selectedSlots.filter(s => s.id !== formatted.id));
    } else if (selectedSlots.length < 5) {
      // If not already selected and less than 5 slots, add it
      setSelectedSlots([...selectedSlots, formatted]);
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = 'Enter a valid phone number (e.g., +11234567890)';
    }
    
    if (!inviteeName) {
      newErrors.inviteeName = 'Invitee name is required';
    }
    
    if (selectedSlots.length === 0) {
      newErrors.slots = 'Select at least one available time slot';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Format availabilities for the API
      const availabilities = selectedSlots.map(slot => ({
        start: slot.start,
        end: slot.end
      }));
      
      // Call API to place call
      await onPlaceCall({
        phoneNumber,
        inviteeName,
        occasion,
        duration,
        availabilities,
        voice: 'josh' // Default voice
      });
      
      // Reset form after successful submission
      setSuccess(true);
      setSelectedSlots([]);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h5" component="h2" gutterBottom>
        Schedule a Meeting
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Call placed successfully!
        </Alert>
      )}
      
      <Grid container spacing={2}>
        {/* Invitee Info Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="bold">
            Contact Information
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone Number"
            variant="outlined"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+11234567890"
            error={!!errors.phoneNumber}
            helperText={errors.phoneNumber}
            disabled={submitting}
            required
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Invitee Name"
            variant="outlined"
            value={inviteeName}
            onChange={(e) => setInviteeName(e.target.value)}
            error={!!errors.inviteeName}
            helperText={errors.inviteeName}
            disabled={submitting}
            required
          />
        </Grid>
        
        {/* Meeting Details Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Meeting Details
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Occasion</InputLabel>
            <Select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              label="Occasion"
              disabled={submitting}
            >
              {occasionOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Duration</InputLabel>
            <Select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              label="Duration"
              disabled={submitting}
            >
              {durationOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Available Slots Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Available Time Slots
            </Typography>
            <IconButton onClick={onRefreshSlots} disabled={loading || submitting} size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          <FormHelperText>
            Select up to 5 slots (select between 8am-9pm {localTimezone})
          </FormHelperText>
          
          <Box sx={{ mt: 1, maxHeight: '200px', overflowY: 'auto', p: 1, border: errors.slots ? '1px solid #f44336' : '1px solid #e0e0e0', borderRadius: '4px' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : freeSlots.length === 0 ? (
              <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                No available slots found. Try refreshing.
              </Typography>
            ) : (
              <Grid container spacing={1}>
                {/* Split the slots into two columns for even distribution */}
                <Grid item xs={6}>
                  <Grid container spacing={1}>
                    {freeSlots.slice(0, Math.ceil(freeSlots.length / 2)).map((slot) => {
                      const formatted = formatSlot(slot);
                      const isSelected = selectedSlots.some(s => s.id === formatted.id);
                      
                      return (
                        <Grid item xs={12} key={formatted.id}>
                          <Chip
                            label={formatted.label}
                            onClick={() => handleSlotSelect(formatted)}
                            color={isSelected ? "primary" : "default"}
                            disabled={submitting || (!isSelected && selectedSlots.length >= 5)}
                            sx={{ 
                              width: '100%',
                              justifyContent: 'flex-start',
                              '&.MuiChip-root': {
                                cursor: 'pointer'
                              }
                            }}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
                
                <Grid item xs={6}>
                  <Grid container spacing={1}>
                    {freeSlots.slice(Math.ceil(freeSlots.length / 2)).map((slot) => {
                      const formatted = formatSlot(slot);
                      const isSelected = selectedSlots.some(s => s.id === formatted.id);
                      
                      return (
                        <Grid item xs={12} key={formatted.id}>
                          <Chip
                            label={formatted.label}
                            onClick={() => handleSlotSelect(formatted)}
                            color={isSelected ? "primary" : "default"}
                            disabled={submitting || (!isSelected && selectedSlots.length >= 5)}
                            sx={{ 
                              width: '100%',
                              justifyContent: 'flex-start',
                              '&.MuiChip-root': {
                                cursor: 'pointer'
                              }
                            }}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Box>
          {errors.slots && (
            <FormHelperText error>{errors.slots}</FormHelperText>
          )}
        </Grid>
        
        {/* Selected Slots Summary */}
        {selectedSlots.length > 0 && (
          <Grid item xs={12}>
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2">
                Selected Slots ({selectedSlots.length}/5):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
                {selectedSlots.map((slot) => (
                  <Chip
                    key={slot.id}
                    label={slot.label}
                    onDelete={() => handleSlotSelect(slot)}
                    color="primary"
                    variant="outlined"
                    sx={{ m: 0.5 }}
                    disabled={submitting}
                  />
                ))}
              </Box>
            </Box>
          </Grid>
        )}
        
        {/* Submit Button */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading || submitting}
            sx={{ py: 1.5 }}
          >
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Call & Schedule Meeting'
            )}
          </Button>
          <Typography variant="caption" color="textSecondary" align="center" display="block" sx={{ mt: 1 }}>
            Relevant slots are between 8am-9pm {localTimezone}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScheduleMeeting;
