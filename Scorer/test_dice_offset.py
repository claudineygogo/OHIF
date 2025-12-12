import numpy as np
from scorer import dice_score

def test_alignment():
    print("Running alignment test with NEW logic (both shifted)...")
    
    # Create a reference mask: 10 slices, 512x512
    # Place a 10x10 square at slice 0, pos (100,100)
    # This simulates a reference chunk that starts exactly where the user is drawing
    ref_mask = np.zeros((10, 512, 512), dtype=np.uint8)
    ref_mask[0, 100:110, 100:110] = 1
    
    # Create a user mask: 1 slice, 512x512
    # Place the same square at slice 0
    user_mask = np.zeros((1, 512, 512), dtype=np.uint8)
    user_mask[0, 100:110, 100:110] = 1
    
    # Test 1: Correct alignment
    # Both placed at index 285.
    # Ref data ends up at 285 + 0 = 285.
    # User data ends up at 285 + 0 = 285.
    # Should match.
    score_match = dice_score(ref_mask, user_mask, user_origin_index=285)
    print(f"Test 1 (Match expected): Score = {score_match}")
    
    if score_match == 1.0:
        print("PASS: Perfect match with correct index.")
    else:
        print(f"FAIL: Expected 1.0, got {score_match}")

    # Test 2: Mismatch due to content difference (sanity check)
    # User draws somewhere else
    user_mask_wrong = np.zeros((1, 512, 512), dtype=np.uint8)
    user_mask_wrong[0, 200:210, 200:210] = 1
    
    score_mismatch = dice_score(ref_mask, user_mask_wrong, user_origin_index=285)
    print(f"Test 2 (Mismatch expected): Score = {score_mismatch}")
    
    if score_mismatch == 0.0:
        print("PASS: No match with wrong content.")
    else:
        print(f"FAIL: Expected 0.0, got {score_mismatch}")

if __name__ == "__main__":
    test_alignment()
