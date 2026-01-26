from flask import Flask, jsonify, request
from flask_cors import CORS
import pydicom
from scorer import dice_score, reconstruct_mask
import numpy as np
import json
import os

app = Flask(__name__)

# Enable CORS for all origins on all endpoints with explicit configuration
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False
    }
})

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify server is running"""
    return jsonify({"status": "Scorer online"})

@app.route('/grade_submission', methods=['POST', 'OPTIONS'])
def grade_submission():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response, 200
    """
    Grade a segmentation submission by calculating the Dice Score.

    Accepts compressed user mask data (non-zero indices) and compares it against
    the reference segmentation stored in JSON format.

    Expected request body:
    {
        "non_zero_indices": [...],  // 1D array of flat indices where mask = 1
        "origin_slice_index": int   // Starting slice index in the volume
    }

    Returns:
    {
        "dice_score": float (0.0 to 1.0),
        "reference_data": {
            "non_zero_indices": [...],  // 1D array of flat indices for reference mask
            "origin_slice_index": int   // Starting slice index for reference mask
        }
    }
    """
    try:
        # Parse the incoming JSON request
        data = request.get_json()

        # Validate required fields for SCORING
        if not data or 'non_zero_indices' not in data:
            # Try to see if it's a "Context Check" or just invalid
            return jsonify({"error": "Missing 'non_zero_indices' in request body"}), 400

        if 'origin_slice_index' not in data:
            return jsonify({"error": "Missing 'origin_slice_index' in request body"}), 400

        # Extract user data
        user_indices = data['non_zero_indices']
        user_origin_index = data['origin_slice_index']

        # Extract Context (Optional - Fallback to singleton mode if missing)
        patient_id = data.get('patient_id')
        structure_name = data.get('structure_name')

        print(f"[DEBUG] Received {len(user_indices)} non-zero indices")
        print(f"[DEBUG] User origin_slice_index: {user_origin_index}")
        print(f"[DEBUG] Grading Context - Patient: {patient_id}, Structure: {structure_name}")

        script_dir = os.path.dirname(os.path.abspath(__file__))

        # Validate Context
        if not patient_id or not structure_name:
             return jsonify({"error": "Missing 'patient_id' or 'structure_name' in request body"}), 400

        # Sanitize inputs
        safe_patient = "".join([c for c in patient_id if c.isalnum() or c in (' ', '.', '_', '-')]).strip()
        safe_structure = "".join([c for c in structure_name if c.isalnum() or c in (' ', '.', '_', '-')]).strip()

        json_path = os.path.join(script_dir, 'References', safe_patient, f"{safe_structure}.json")

        print(f"[DEBUG] Loading reference JSON from: {json_path}")

        # Defaults
        ref_origin_index = 28 # Legacy Default

        try:
            if not os.path.exists(json_path):
                raise FileNotFoundError(f"Reference JSON file not found at: {json_path}")

            with open(json_path, 'r') as f:
                ref_data = json.load(f)

            if 'non_zero_indices' not in ref_data:
                raise ValueError("JSON file missing 'non_zero_indices'")

            ref_indices = ref_data['non_zero_indices']

            # Check if JSON contains specific origin (Multi-structure support)
            if 'origin_slice_index' in ref_data:
                ref_origin_index = ref_data['origin_slice_index']
                print(f"[DEBUG] Using origin_slice_index from JSON: {ref_origin_index}")
            else:
                print(f"[DEBUG] JSON missing 'origin_slice_index'. Using default: {ref_origin_index}")

            # Direct Comparison Logging
            print(f"[DEBUG] User indices count: {len(user_indices)}")
            print(f"[DEBUG] Reference indices count: {len(ref_indices)}")

            user_set = set(user_indices)
            ref_set = set(ref_indices)
            intersection = user_set.intersection(ref_set)

            print(f"[DEBUG] Intersection count: {len(intersection)}")

            if len(user_set) == len(ref_set) == len(intersection):
                print("[DEBUG] SUCCESS: User and Reference indices are IDENTICAL.")
            else:
                print(f"[DEBUG] MISMATCH: Missing in user: {len(ref_set - user_set)}, Extra in user: {len(user_set - ref_set)}")

        except Exception as e:
            print(f"[ERROR] Failed to read reference JSON: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "error": f"Failed to load reference JSON: {str(e)}"
            }), 500

        # Reconstruct both masks to full 3D volumes
        # Standard DICOM volume shape: (295 slices, 512x512)
        target_shape = (295, 512, 512)

        print(f"[DEBUG] Reconstructing user mask...")
        user_mask = reconstruct_mask(user_indices, user_origin_index, target_shape)

        print(f"[DEBUG] Reconstructing reference mask...")
        reference_mask = reconstruct_mask(ref_indices, ref_origin_index, target_shape)

        # Calculate Dice Score
        score = dice_score(reference_mask, user_mask)

        print(f"[DEBUG] Final Dice Score: {score}")

        # Return the score and reference data as JSON
        return jsonify({
            "dice_score": float(score),
            "reference_data": {
                "non_zero_indices": ref_indices,
                "origin_slice_index": ref_origin_index
            }
        }), 200

    except ValueError as e:
        print(f"[ERROR] ValueError: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except FileNotFoundError as e:
        print(f"[ERROR] FileNotFoundError: {str(e)}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        # Return error message if something goes wrong
        print(f"[ERROR] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    # Run server on 0.0.0.0:5002 to avoid conflict with Docker on 5000
    app.run(host='0.0.0.0', port=5002, debug=True)
