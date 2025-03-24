import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get Bland AI API key from environment variables
bland_api_key = os.getenv("BLAND_API_KEY")
if not bland_api_key:
    raise ValueError("BLAND_API_KEY environment variable is not set. Please add it to your .env file.")

def place_call(phone_number, task_description, voice="josh"):
    """
    Place a call using the Bland AI API
    
    Args:
        phone_number (str): The phone number to call in E.164 format (e.g., +14154015151)
        task_description (str): Instructions for the AI agent
        voice (str): The voice ID to use for the call
        
    Returns:
        dict: The response from the Bland AI API
    """
    url = "https://api.bland.ai/v1/calls"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {bland_api_key}"
    }
    
    payload = {
        "phone_number": phone_number,
        "task": task_description,
        "voice": voice,
        "reduce_latency": True,
        "background_track": "office"  # Adding background noise for more natural calls
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error placing call: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status code: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        return None

if __name__ == "__main__":
    # Phone number to call (in E.164 format)
    phone_number = "+14154015151"
    
    # Task description for the AI agent
    task_description = """
    You are a friendly assistant calling to introduce yourself and share some information about AI technology.
    
    Start by introducing yourself, mentioning that you're an AI assistant from Bland AI.
    Ask how the person is doing today.
    Share a brief overview of how AI voice technology works.
    Thank them for their time and end the call politely.
    
    If they ask questions about AI, answer them briefly and clearly.
    If they want to end the call early, respect their request and thank them for their time.
    """
    
    # Place the call
    print(f"Placing call to {phone_number}...")
    response = place_call(phone_number, task_description)
    
    if response:
        print(f"Call placed successfully! Call ID: {response.get('call_id')}")
        print(f"Call status: {response.get('status')}")
        print(f"Full response: {json.dumps(response, indent=2)}")
    else:
        print("Failed to place call.")
