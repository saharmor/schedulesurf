import os
import atexit
import threading
import json
import logging
import traceback
from dotenv import load_dotenv
from langchain.agents import create_openai_functions_agent, AgentExecutor
from langchain import hub
from langchain_openai import ChatOpenAI
from composio_langchain import ComposioToolSet
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Register cleanup function to prevent threading errors on exit
def cleanup():
    # Force cleanup of threading resources
    for thread in threading.enumerate():
        if thread is not threading.main_thread():
            if hasattr(thread, '_stop') and callable(thread._stop):
                try:
                    thread._stop()
                except:
                    pass

# Register the cleanup function to run on exit
atexit.register(cleanup)

def initialize_agent():
    # Load environment variables from .env file
    load_dotenv()
    
    # Get API keys from environment variables
    composio_api_key = os.getenv("COMPOSIO_API_KEY")
    
    # Initialize the language model with the API key
    llm = ChatOpenAI()
    prompt = hub.pull("hwchase17/openai-functions-agent")
    
    # Set up Composio with the API key from .env
    composio_toolset = ComposioToolSet(api_key=composio_api_key)
    tools = composio_toolset.get_tools(actions=['GOOGLECALENDAR_FIND_FREE_SLOTS'])
    
    # Create the agent
    agent = create_openai_functions_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    return agent_executor

def find_free_slots(time_min=None, time_max=None, timezone="UTC"):
    """
    Find free time slots in the calendar using Composio
    
    Args:
        time_min (str): Start time in ISO format (YYYY-MM-DDThh:mm:ssZ)
        time_max (str): End time in ISO format (YYYY-MM-DDThh:mm:ssZ)
        timezone (str): Timezone to use (default: UTC)
        
    Returns:
        list: List of free time slots with start and end times
    """
    print(f"DEBUG: Starting find_free_slots with time_min={time_min}, time_max={time_max}, timezone={timezone}")
    
    try:
        # Initialize the agent
        print("DEBUG: Initializing agent...")
        agent_executor = initialize_agent()
        print("DEBUG: Agent initialized successfully")
        
        # Set default time range if not provided
        start_date = datetime.now()
        end_date = start_date + timedelta(days=7)
        
        if not time_min:
            time_min = start_date.strftime('%Y-%m-%dT00:00:00Z')
            print(f"DEBUG: Using default time_min: {time_min}")
        if not time_max:
            time_max = end_date.strftime('%Y-%m-%dT00:00:00Z')
            print(f"DEBUG: Using default time_max: {time_max}")
        
        # Parse the time strings to datetime for display in the task
        try:
            print(f"DEBUG: Parsing time strings: {time_min} and {time_max}")
            start_dt = datetime.strptime(time_min, '%Y-%m-%dT%H:%M:%SZ')
            end_dt = datetime.strptime(time_max, '%Y-%m-%dT%H:%M:%SZ')
            print(f"DEBUG: Successfully parsed time strings to datetime objects")
        except ValueError as e:
            print(f"DEBUG: Error parsing time strings: {str(e)}. Using default datetime objects.")
            # If parsing fails, use the datetime objects we already have
            start_dt = start_date
            end_dt = end_date
        
        # Define the task to find free slots in the calendar for the specified date range
        task = f"Get free slots between {time_min} and {time_max} and return them in a list of json objects where each slot is a json object with start and end times. DON'T ADD ANY COMMENTS OR ADDITIONAL TEXT. Just a list with json objects. No need to name the list as well!"
        task += f" Use the {timezone} timezone"
        print(f"DEBUG: Executing task with prompt: {task}")
        
        result = agent_executor.invoke({"input": task})
        print(f"DEBUG: Agent execution completed successfully")
        
        try:
            print("DEBUG: Parsing result output as JSON...")
            print(f"DEBUG: Raw output: {result['output']}")
            response_data = json.loads(result['output'])
            print(f"DEBUG: Successfully parsed JSON. Found {len(response_data)} free slots")
            
            # Log sample of first few slots
            if response_data and len(response_data) > 0:
                print(f"DEBUG: Sample slot: {response_data[0]}")
        except json.JSONDecodeError as e:
            print(f"DEBUG: JSON parsing error: {str(e)}")
            print(f"DEBUG: Raw output that couldn't be parsed: {result['output']}")
            # Return empty list on JSON parse error
            response_data = []
        
        print("DEBUG: Cleaning up resources...")
        cleanup()
        
        print(f"{response_data}")
        return response_data
    except Exception as e:
        print(f"DEBUG: Error in find_free_slots: {str(e)}")
        print(traceback.format_exc())
        # Return empty list on error
        return []

# If running directly, test the function
if __name__ == "__main__":
    # Test the function for next week
    start_date = datetime.now()
    end_date = start_date + timedelta(days=7)
    
    time_min = start_date.strftime('%Y-%m-%dT00:00:00Z')
    time_max = end_date.strftime('%Y-%m-%dT00:00:00Z')
    
    print(f"Finding free slots from {time_min} to {time_max}...")
    slots = find_free_slots(time_min, time_max)
    
    print(f"Found {len(slots)} free slots:")
    for slot in slots:
        start = datetime.strptime(slot['start'], '%Y-%m-%dT%H:%M:%SZ')
        end = datetime.strptime(slot['end'], '%Y-%m-%dT%H:%M:%SZ')
        print(f"From {start} to {end}")
    
    # Call cleanup explicitly before exiting
    cleanup()
