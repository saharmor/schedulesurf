import axios from 'axios';

const API_URL = 'http://localhost:5002/api';

// API service for communicating with the backend
const apiService = {
  // Get free slots from the user's calendar
  getFreeSlots: async (days = 7) => {
    try {
      const response = await axios.get(`${API_URL}/free-slots`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching free slots:', error);
      throw error;
    }
  },

  // Place a call using Bland AI
  placeCall: async (callData) => {
    try {
      const response = await axios.post(`${API_URL}/place-call`, callData);
      return response.data;
    } catch (error) {
      console.error('Error placing call:', error);
      throw error;
    }
  },

  // Get the status of a call
  getCallStatus: async (callId) => {
    try {
      const response = await axios.get(`${API_URL}/call-status/${callId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching call status for call ${callId}:`, error);
      throw error;
    }
  },

  // Get all active calls
  getActiveCalls: async () => {
    try {
      const response = await axios.get(`${API_URL}/active-calls`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active calls:', error);
      throw error;
    }
  }
};

export default apiService;
