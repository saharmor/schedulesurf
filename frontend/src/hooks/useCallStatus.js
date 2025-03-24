import { useState, useEffect } from 'react';
import apiService from '../services/api';
import { checkMcpAvailability, formatMcpCallData } from '../utils/mcpUtils';

/**
 * Custom hook to handle call status updates
 * Integrates with Bland MCP if available, otherwise falls back to API polling
 */
const useCallStatus = (callId, initialData = null) => {
  const [callData, setCallData] = useState(initialData || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingMcp, setUsingMcp] = useState(false);

  // Initialize and set up the status tracking
  useEffect(() => {
    if (!callId) return;

    let intervalId;
    const isMcpAvailable = checkMcpAvailability();
    setUsingMcp(isMcpAvailable);

    // Function to fetch call status from our backend API
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

    // Set up MCP event listener if available
    if (isMcpAvailable && window.blandmcp) {
      const handleMcpUpdate = async (mcpEvent) => {
        // Only process updates for the current call
        if (mcpEvent && mcpEvent.call_id === callId) {
          try {
            // Get full call details
            const mcpData = await window.blandmcp.get_call_details(callId);
            // Format MCP data to match our app's format
            const formattedData = formatMcpCallData(mcpData);
            setCallData(prevData => ({
              ...prevData,
              ...formattedData
            }));
            setError(null);
          } catch (err) {
            console.error('Error processing MCP update:', err);
            // Fall back to API if MCP fails
            fetchCallStatus();
          }
        }
      };

      // Register for updates
      if (window.blandmcp.registerCallListener) {
        window.blandmcp.registerCallListener(callId, handleMcpUpdate);
        console.log('MCP call listener registered for call:', callId);
        
        // Initial fetch using MCP
        handleMcpUpdate({ call_id: callId });
      } else {
        // MCP available but no listener functionality, fall back to API
        fetchCallStatus();
        setUsingMcp(false);
      }

      // Clean up MCP listener on unmount
      return () => {
        if (window.blandmcp.unregisterCallListener) {
          window.blandmcp.unregisterCallListener(callId);
        }
      };
    } else {
      // No MCP available, use API polling
      fetchCallStatus();

      // Set up polling every 3 seconds for active calls
      intervalId = setInterval(fetchCallStatus, 3000);

      // Clean up interval on unmount
      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [callId]);

  return {
    callData,
    loading,
    error,
    usingMcp,
    // Method to force refresh
    refresh: async () => {
      setLoading(true);
      try {
        const data = await apiService.getCallStatus(callId);
        setCallData(data);
        setError(null);
        return data;
      } catch (err) {
        setError('Failed to refresh call status');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };
};

export default useCallStatus;
