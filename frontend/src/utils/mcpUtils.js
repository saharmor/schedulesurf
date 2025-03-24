/**
 * Utility functions for Bland AI MCP integration
 */

// Check if MCP is available in the window context
export const checkMcpAvailability = () => {
  return typeof window !== 'undefined' && window.blandmcp !== undefined;
};

// Initialize MCP with event listeners
export const initializeMcp = (onStatusUpdate) => {
  if (!checkMcpAvailability()) {
    console.warn('Bland MCP not available. Falling back to API calls.');
    return false;
  }

  try {
    // Register for real-time updates from Bland MCP if available
    if (window.blandmcp && window.blandmcp.registerStatusListener) {
      window.blandmcp.registerStatusListener(onStatusUpdate);
      console.log('Bland MCP status listener registered successfully');
    }
    return true;
  } catch (error) {
    console.error('Error initializing Bland MCP:', error);
    return false;
  }
};

// Format call data from MCP to match our application's format
export const formatMcpCallData = (mcpData) => {
  if (!mcpData) return null;
  
  // Transform the MCP data structure to match our app's expected format
  return {
    call_id: mcpData.call_id,
    status: mcpData.status,
    duration_seconds: mcpData.duration,
    credits_used: mcpData.credits,
    transcript: mcpData.transcript ? formatTranscript(mcpData.transcript) : [],
    events: generateEventsFromMcp(mcpData),
  };
};

// Format transcript data from MCP
const formatTranscript = (transcript) => {
  if (!transcript || typeof transcript !== 'string') return [];
  
  try {
    // If transcript is a string, try to parse it as JSON
    if (typeof transcript === 'string') {
      try {
        transcript = JSON.parse(transcript);
      } catch (e) {
        // If not parseable as JSON, split by newlines and format
        return transcript.split('\n').map((line, index) => {
          const isAgent = line.toLowerCase().includes('agent:') || line.toLowerCase().includes('ai:');
          return {
            role: isAgent ? 'agent' : 'user',
            text: line.replace(/^(Agent:|User:|AI:)/i, '').trim(),
          };
        });
      }
    }
    
    // If transcript is already an array, ensure it has the correct format
    if (Array.isArray(transcript)) {
      return transcript.map(entry => ({
        role: entry.role || entry.speaker || 'unknown',
        text: entry.text || entry.content || '',
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error formatting transcript:', error);
    return [];
  }
};

// Generate events array from MCP data
const generateEventsFromMcp = (mcpData) => {
  const events = [];
  const now = new Date().toISOString();
  
  if (mcpData.created_at) {
    events.push({
      time: mcpData.created_at,
      status: 'Call initiated',
      details: 'Request sent to Bland AI'
    });
  }
  
  if (mcpData.status === 'queued' || mcpData.queue_time) {
    events.push({
      time: mcpData.queue_time || now,
      status: 'Call queued',
      details: 'Call is waiting in queue'
    });
  }
  
  if (mcpData.status === 'in_progress' || mcpData.start_time) {
    events.push({
      time: mcpData.start_time || now,
      status: 'Call in progress',
      details: 'Conversation has started'
    });
  }
  
  if (mcpData.status === 'completed' || mcpData.end_time) {
    events.push({
      time: mcpData.end_time || now,
      status: 'Call completed',
      details: `Call finished after ${mcpData.duration || 0} seconds`
    });
  }
  
  if (mcpData.status === 'error') {
    events.push({
      time: now,
      status: 'Call error',
      details: mcpData.error || 'An error occurred during the call'
    });
  }
  
  return events;
};
