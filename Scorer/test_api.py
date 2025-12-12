import requests
import json

# Test the /grade_submission endpoint
url = 'http://localhost:5000/grade_submission'

# Send a dummy POST request with test data
# (The server will ignore this and use local files for Step 3)
payload = {
    "non_zero_indices": [100, 101, 102], # Dummy indices
    "origin_slice_index": 0
}

print("="*60)
print("Testing /grade_submission endpoint")
print("="*60)
print(f"URL: {url}")
print(f"Method: POST")
print(f"Payload: {json.dumps(payload, indent=2)}")
print("\nSending request...")

try:
    response = requests.post(url, json=payload)
    
    print(f"\nResponse Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"\nResponse Body:")
    print(json.dumps(response.json(), indent=2))
    
    if response.status_code == 200:
        dice_score = response.json().get('dice_score')
        print(f"\n[SUCCESS] Dice Score: {dice_score}")
    else:
        print(f"\n[ERROR] Request failed with status {response.status_code}")
        
except requests.exceptions.ConnectionError:
    print("\n[ERROR] Could not connect to server.")
    print("Make sure the Flask server is running on port 5000:")
    print("  python app.py")
except Exception as e:
    print(f"\n[ERROR] {type(e).__name__}: {e}")

print("="*60)
