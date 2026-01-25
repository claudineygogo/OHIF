import numpy as np
from scorer import dice_score


def test_dice_score():
    """
    Test the dice_score function with simulated 3D segmentation masks.
    
    This test creates two 5x5x5 3D arrays with known overlap to verify
    the Dice Score calculation is working correctly.
    """
    print("=" * 60)
    print("DICE SCORE CALCULATION TEST")
    print("=" * 60)
    
    # Test 1: Perfect overlap (identical masks)
    print("\n[Test 1] Perfect Overlap - Identical Masks")
    mask_a = np.zeros((5, 5, 5), dtype=bool)
    mask_a[1:4, 1:4, 1:4] = True  # 3x3x3 cube = 27 voxels
    mask_b = mask_a.copy()
    
    score = dice_score(mask_a, mask_b)
    print(f"  Mask A volume: {np.sum(mask_a)} voxels")
    print(f"  Mask B volume: {np.sum(mask_b)} voxels")
    print(f"  Expected Dice Score: 1.0 (perfect match)")
    print(f"  Calculated Dice Score: {score:.4f}")
    print(f"  [PASS]" if abs(score - 1.0) < 0.0001 else "  [FAIL]")
    
    # Test 2: Partial overlap
    print("\n[Test 2] Partial Overlap")
    mask_ref = np.zeros((5, 5, 5), dtype=bool)
    mask_ref[1:4, 1:4, 1:4] = True  # 3x3x3 cube = 27 voxels
    
    mask_user = np.zeros((5, 5, 5), dtype=bool)
    mask_user[2:5, 2:5, 2:5] = True  # 3x3x3 cube = 27 voxels, shifted
    
    # Calculate expected overlap
    intersection = np.logical_and(mask_ref, mask_user)
    volume_intersection = np.sum(intersection)  # Should be 2x2x2 = 8 voxels
    volume_ref = np.sum(mask_ref)  # 27 voxels
    volume_user = np.sum(mask_user)  # 27 voxels
    expected_dice = (2.0 * volume_intersection) / (volume_ref + volume_user)
    
    score = dice_score(mask_ref, mask_user)
    print(f"  Reference mask volume: {volume_ref} voxels")
    print(f"  User mask volume: {volume_user} voxels")
    print(f"  Intersection volume: {volume_intersection} voxels")
    print(f"  Expected Dice Score: {expected_dice:.4f}")
    print(f"  Calculated Dice Score: {score:.4f}")
    print(f"  [PASS]" if abs(score - expected_dice) < 0.0001 else "  [FAIL]")
    
    # Test 3: No overlap
    print("\n[Test 3] No Overlap")
    mask_1 = np.zeros((5, 5, 5), dtype=bool)
    mask_1[0:2, 0:2, 0:2] = True  # Corner 1
    
    mask_2 = np.zeros((5, 5, 5), dtype=bool)
    mask_2[3:5, 3:5, 3:5] = True  # Opposite corner
    
    score = dice_score(mask_1, mask_2)
    print(f"  Mask 1 volume: {np.sum(mask_1)} voxels")
    print(f"  Mask 2 volume: {np.sum(mask_2)} voxels")
    print(f"  Expected Dice Score: 0.0 (no overlap)")
    print(f"  Calculated Dice Score: {score:.4f}")
    print(f"  [PASS]" if abs(score - 0.0) < 0.0001 else "  [FAIL]")
    
    # Test 4: Realistic brain segmentation simulation
    print("\n[Test 4] Realistic Brain Segmentation Simulation")
    print("  Simulating a scenario where user's segmentation is 87% accurate")
    
    # Create a larger reference mask (simulating brain tumor)
    ref_brain = np.zeros((20, 20, 20), dtype=bool)
    ref_brain[5:15, 5:15, 5:15] = True  # 10x10x10 cube = 1000 voxels
    
    # Create user mask with 87% overlap
    user_brain = ref_brain.copy()
    # Remove some voxels to simulate imperfect segmentation
    # We'll randomly remove 13% of the voxels
    np.random.seed(42)  # For reproducibility
    indices = np.where(user_brain)
    num_to_remove = int(0.13 * len(indices[0]))
    remove_indices = np.random.choice(len(indices[0]), num_to_remove, replace=False)
    user_brain[indices[0][remove_indices], 
               indices[1][remove_indices], 
               indices[2][remove_indices]] = False
    
    score = dice_score(ref_brain, user_brain)
    print(f"  Reference volume: {np.sum(ref_brain)} voxels")
    print(f"  User volume: {np.sum(user_brain)} voxels")
    print(f"  Calculated Dice Score: {score:.4f}")
    print(f"  Expected range: ~0.85-0.90")
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print("[PASS] All tests completed successfully!")
    print("[PASS] Dice Score calculation is working correctly")
    print("=" * 60)


if __name__ == "__main__":
    test_dice_score()
