import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
from datetime import datetime, timedelta
import threading
import openai

# Import the function to find free slots from the existing script
from find_free_events import find_free_slots

# Load environment variables
load_dotenv()

# Get API keys from environment
bland_api_key = os.getenv("BLAND_API_KEY")
if not bland_api_key:
    raise ValueError("BLAND_API_KEY environment variable is not set")

# Set OpenAI API key
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# Configure OpenAI client
client = openai.OpenAI(api_key=openai_api_key)

app = Flask(__name__)
# Configure CORS with specific settings to prevent 403 errors
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Allow all origins for testing
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["*"]
    }
})

# Store active calls for tracking
active_calls = {}

@app.route('/api/free-slots', methods=['GET'])
def get_free_slots():
    """Get free slots from the user's calendar"""
    try:
        # Use the existing function to get free slots
        days_ahead = int(request.args.get('days', 7))
        
        # Calculate start and end dates
        start_date = datetime.now()
        end_date = start_date + timedelta(days=days_ahead)
        
        # Format dates for the API
        time_min = start_date.strftime('%Y-%m-%dT00:00:00Z')
        time_max = end_date.strftime('%Y-%m-%dT00:00:00Z')
        
        # Get free slots
        slots = find_free_slots(time_min, time_max)
        
        # Return the slots
        return jsonify(slots)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/place-call', methods=['POST'])
def place_call():
    """Place a call using the Bland AI API"""
    try:
        print("DEBUG: Received call placement request")
        data = request.json
        print(f"DEBUG: Request data: {data}")
        
        phone_number = data.get('phoneNumber')
        invitee_name = data.get('inviteeName')
        occasion = data.get('occasion')
        duration = data.get('duration')
        availabilities = data.get('availabilities', [])
        
        print(f"DEBUG: Extracted data - phone: {phone_number}, name: {invitee_name}, occasion: {occasion}, duration: {duration}")
        print(f"DEBUG: Availabilities: {availabilities}")
        
        if not phone_number or not invitee_name or not occasion or not duration or not availabilities:
            print("DEBUG: Missing required fields")
            return jsonify({"error": "Missing required fields"}), 400
        
        # Format availabilities for the prompt
        formatted_availabilities = []
        try:
            print("DEBUG: Formatting availabilities")
            for slot in availabilities:
                start = datetime.fromisoformat(slot['start'].replace('Z', '+00:00'))
                end = datetime.fromisoformat(slot['end'].replace('Z', '+00:00'))
                formatted_slot = f"{start.strftime('%A, %B %d from %I:%M %p')} to {end.strftime('%I:%M %p')}"
                formatted_availabilities.append(formatted_slot)
            
            availabilities_text = ", ".join(formatted_availabilities)
            print(f"DEBUG: Formatted availabilities: {availabilities_text}")
        except Exception as e:
            print(f"DEBUG: Error formatting availabilities: {str(e)}")
            return jsonify({"error": f"Error formatting availabilities: {str(e)}"}), 500
        
        # Generate task description
        task_description = f"""
        Call {invitee_name} and find a time slot to meet for a {occasion}. 
        The {occasion} is {duration} and my availability is {availabilities_text}. 
        Take my availability, occasion, and duration into account when finding a slot.
        A slot cannot be booked before 8am or after 9pm!
        Once you find an available slot, ask {invitee_name}'s email so I can send an invite.
        """
        print(f"DEBUG: Task description created: {task_description[:100]}...")
        
        # Define Bland API endpoint
        url = "https://api.bland.ai/v1/calls"
        
        # Set headers and check API key
        print(f"DEBUG: BLAND_API_KEY length: {len(bland_api_key) if bland_api_key else 'None'}")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {bland_api_key}"
        }
        
        # Set payload
        payload = {
            "phone_number": phone_number,
            "task": task_description,
            "background_track": "office"
        }
        
        # Make the request to Bland AI
        print("DEBUG: Making request to Bland AI")
        try:
            response = requests.post(url, headers=headers, json=payload)
            print(f"DEBUG: Bland API response status: {response.status_code}")
            print(f"DEBUG: Bland API response content: {response.text[:200]}")
            response.raise_for_status()
            result = response.json()
            print(f"DEBUG: Successfully parsed API response: {result}")
        except requests.exceptions.RequestException as e:
            print(f"DEBUG: Error making Bland API request: {str(e)}")
            return jsonify({"error": f"Bland API error: {str(e)}"}), 500
        
        # Store call info for tracking
        call_id = result.get('call_id')
        if call_id:
            active_calls[call_id] = {
                'status': result.get('status', 'initiated'),
                'invitee_name': invitee_name,
                'phone_number': phone_number,
                'occasion': occasion,
                'duration': duration,
                'start_time': datetime.now().isoformat(),
                'events': [
                    {
                        'time': datetime.now().isoformat(),
                        'status': 'Call initiated',
                        'details': 'Call request sent to Bland AI'
                    }
                ]
            }
        
        return jsonify(result)
    except requests.exceptions.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_details = e.response.json()
                error_message = error_details.get('error', error_message)
            except:
                error_message = f"Error {e.response.status_code}: {e.response.text}"
        return jsonify({"error": error_message}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/call-status/<call_id>', methods=['GET'])
def call_status(call_id):
    """Get the status of a call from Bland AI"""
    try:
        if call_id in active_calls:
            # First, return our cached information
            cached_info = active_calls[call_id]
            
            # Then, also fetch the latest status from Bland AI
            url = f"https://api.bland.ai/v1/calls/{call_id}"
            headers = {
                "Authorization": f"Bearer {bland_api_key}"
            }
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            result = response.json()
            
            # Update our cached information
            new_status = result.get('status')
            if new_status and new_status != cached_info['status']:
                cached_info['status'] = new_status
                cached_info['events'].append({
                    'time': datetime.now().isoformat(),
                    'status': f'Status changed to {new_status}',
                    'details': 'Status update from Bland AI'
                })
                
            # Add call duration if available
            if 'duration' in result:
                cached_info['duration_seconds'] = result['duration']
                
            # Add credits if available
            if 'credits' in result:
                cached_info['credits_used'] = result['credits']
                
            # Format and add transcript if available
            if result.get('transcripts'):
                # Convert Bland AI transcript format to our frontend format
                cached_info['transcript'] = [
                    {'role': item['user'], 'text': item['text']} 
                    for item in result.get('transcripts', [])
                ]
                
                # If the call is completed and we don't have extracted info yet, extract it now
                if result.get('status') == 'completed' and 'extracted_info' not in cached_info:
                    try:
                        print(f"DEBUG: Extracting information from transcript on demand")
                        # Use original transcripts format for extraction
                        extracted_info = extract_info_from_transcript(result.get('transcripts'), cached_info)
                        cached_info['extracted_info'] = extracted_info
                        print(f"DEBUG: Successfully extracted information: {extracted_info}")
                    except Exception as e:
                        print(f"DEBUG: Error extracting information from transcript: {str(e)}")
                        cached_info['extraction_error'] = str(e)
                
            # Update the cache
            active_calls[call_id] = cached_info
            
            # Return the combined information
            return jsonify(cached_info)
        else:
            # If we don't have cached info, just get it from Bland AI
            url = f"https://api.bland.ai/v1/calls/{call_id}"
            headers = {
                "Authorization": f"Bearer {bland_api_key}"
            }
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/call-webhook', methods=['POST'])
def call_webhook():
    """Webhook endpoint for Bland AI call status updates"""
    try:
        data = request.json
        call_id = data.get('call_id')
        
        if call_id and call_id in active_calls:
            # Update the call info
            active_calls[call_id]['status'] = data.get('status', 'unknown')
            active_calls[call_id]['events'].append({
                'time': datetime.now().isoformat(),
                'status': f'Webhook update: {data.get("status", "unknown")}',
                'details': json.dumps(data)
            })
            
            # If the call is complete, add the final details
            if data.get('status') == 'completed':
                transcript = data.get('transcript')
                active_calls[call_id]['end_time'] = datetime.now().isoformat()
                active_calls[call_id]['credits_used'] = data.get('credits')
                active_calls[call_id]['duration_seconds'] = data.get('duration')
                active_calls[call_id]['transcript'] = transcript
                
                # Extract information from the transcript using GPT-4o mini
                try:
                    print(f"DEBUG: Extracting information from transcript")
                    # Format transcript for extraction if needed
                    formatted_transcript = transcript
                    extracted_info = extract_info_from_transcript(formatted_transcript, active_calls[call_id])
                    active_calls[call_id]['extracted_info'] = extracted_info
                    print(f"DEBUG: Successfully extracted information: {extracted_info}")
                except Exception as e:
                    print(f"DEBUG: Error extracting information from transcript: {str(e)}")
                    active_calls[call_id]['extraction_error'] = str(e)
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/active-calls', methods=['GET'])
def get_active_calls():
    """Get all active calls"""
    return jsonify(active_calls)

def extract_info_from_transcript(transcript, call_info):
    """Extract email address and agreed time from the call transcript"""
    if not transcript:
        return {"error": "No transcript available"}
    
    # Create context for the extraction
    invitee_name = call_info.get('invitee_name', 'unknown')
    occasion = call_info.get('occasion', 'meeting')
    
    # Format transcript for GPT if needed
    formatted_transcript = ""
    
    # Handle different transcript formats from Bland API
    if isinstance(transcript, list):
        if transcript and isinstance(transcript[0], dict):
            # Handle transcript items with user/text fields
            if 'user' in transcript[0] and 'text' in transcript[0]:
                for item in transcript:
                    formatted_transcript += f"{item['user']}: {item['text']}\n"
            # Handle transcript items with role/text fields
            elif 'role' in transcript[0] and 'text' in transcript[0]:
                for item in transcript:
                    formatted_transcript += f"{item['role']}: {item['text']}\n"
    # Handle concatenated transcript string
    elif isinstance(transcript, str):
        formatted_transcript = transcript
    
    # Use GPT-4o mini to extract the information
    try:
        prompt = f"""
        Below is a transcript of a scheduling call with {invitee_name} for a {occasion}.
        
        Transcript:
        {formatted_transcript}
        
        Please extract the following information:
        1. The email address of {invitee_name}
        2. The agreed date and time for the {occasion}
        
        Format your response as JSON with the following structure:
        {{
            "email": "extracted email or 'not found' if absent",
            "scheduled_time": "extracted date and time or 'not found' if absent",
            "confidence": "high/medium/low based on clarity of the information in the transcript"  
        }}
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Adjust model as needed
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant that extracts specific information from transcripts."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.3,
            n=1
        )
        
        # Parse the response
        extracted_text = response.choices[0].message.content.strip()
        # Handle possible JSON formatting issues
        try:
            # Find JSON in the response
            json_start = extracted_text.find('{')
            json_end = extracted_text.rfind('}')
            if json_start >= 0 and json_end >= 0:
                json_str = extracted_text[json_start:json_end+1]
                result = json.loads(json_str)
            else:
                # Fallback if JSON not properly formatted
                result = {
                    "email": "not found (extraction error)",
                    "scheduled_time": "not found (extraction error)",
                    "confidence": "low",
                    "raw_extraction": extracted_text
                }
        except json.JSONDecodeError:
            result = {
                "email": "not found (parsing error)",
                "scheduled_time": "not found (parsing error)",
                "confidence": "low",
                "raw_extraction": extracted_text
            }
        
        return result
    except Exception as e:
        print(f"Error in GPT extraction: {str(e)}")
        return {
            "email": "not found (API error)",
            "scheduled_time": "not found (API error)",
            "confidence": "none",
            "error": str(e)
        }

# Add a basic route for testing CORS
@app.route('/api/test-cors', methods=['GET'])
def test_cors():
    """Test endpoint for CORS configuration"""
    return jsonify({"message": "CORS is working correctly!"})

if __name__ == '__main__':
    # Start the server on port 5002 to avoid conflicts
    print("Starting server on port 5002 with CORS enabled...")
    app.run(debug=True, port=5002, host='0.0.0.0')
