import requests
import json
import os
import sys

def reproduce():
    # Load the reference JSON
    json_path = os.path.join(os.path.dirname(__file__), 'reference_mask_normalized.json')
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found")
        return

    with open(json_path, 'r') as f:
        ref_data = json.load(f)

    # Extract indices
    if 'non_zero_indices' not in ref_data:
        print("Error: 'non_zero_indices' not found in JSON")
        return
    
    indices = ref_data['non_zero_indices']
    
    # Determine origin
    # app.py uses 28 hardcoded, let's see if it's in the json
    origin = ref_data.get('origin_slice_index', 28)
    
    print(f"Loaded {len(indices)} indices from JSON. Using origin {origin}.")

    # Construct payload
    payload = {
        "non_zero_indices": indices,
        "origin_slice_index": origin
    }

    # Send request
    url = 'http://localhost:5000/grade_submission'
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            score = result.get('dice_score')
            print(f"Response: {json.dumps(result, indent=2)}")
            
            if score == 1.0:
                print("SUCCESS: Dice Score is 1.0")
            else:
                print(f"FAILURE: Dice Score is {score}, expected 1.0")
        else:
            print(f"Error: Server returned status code {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to server. Is it running?")

if __name__ == "__main__":
    reproduce()
