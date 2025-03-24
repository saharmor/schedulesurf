import axios from 'axios';

// Bland MCP service for retrieving call details
const blandMcpService = {
  // Get call details from the Bland AI API
  getCallDetails: async (callId) => {
    try {
      // This function would be added by the MCP docs.bland.ai server
      // It returns detailed call information
      const response = await window.blandmcp.get_call_details(callId);
      return response;
    } catch (error) {
      console.error('Error fetching call details from Bland MCP:', error);
      throw error;
    }
  },
  
  // Mock function for local development/testing
  // This is a fallback if MCP isn't available
  mockGetCallDetails: async (callId) => {
    try {
      // If we can't use the MCP directly, use our backend as a proxy
      const response = await axios.get(`http://localhost:5002/api/call-status/${callId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching mock call details:', error);
      throw error;
    }
  }
};

// Helper function to check if MCP is available
export const isMcpAvailable = () => {
  return window.blandmcp !== undefined;
};

// Returns MCP function or fallback to backend proxy
export const getCallDetails = async (callId) => {
  if (isMcpAvailable()) {
    return blandMcpService.getCallDetails(callId);
  } else {
    return blandMcpService.mockGetCallDetails(callId);
  }
};

export default blandMcpService;
