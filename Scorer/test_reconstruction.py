"""
Test script to verify the reconstruct_mask function works correctly.
This creates a simple test case with known indices and verifies reconstruction.
"""
import numpy as np
from scorer import reconstruct_mask

def test_reconstruction():
    """Test basic reconstruction functionality"""
    print("=" * 60)
    print("TEST 1: Basic Reconstruction")
    print("=" * 60)
    
    # Create a simple test case
    # Let's say we have a 3x3x3 volume and want to set a few voxels
    target_shape = (3, 3, 3)
    
    # Indices for voxels at positions:
    # (0,0,0) -> index 0
    # (0,1,1) -> index 4
    # (1,1,1) -> index 13
    # (2,2,2) -> index 26
    test_indices = [0, 4, 13, 26]
    
    result = reconstruct_mask(test_indices, origin_slice_index=0, target_shape=target_shape)
    
    print(f"\nExpected non-zero voxels: {len(test_indices)}")
    print(f"Actual non-zero voxels: {np.sum(result)}")
    
    # Verify specific positions
    assert result[0, 0, 0] == 1, "Position (0,0,0) should be 1"
    assert result[0, 1, 1] == 1, "Position (0,1,1) should be 1"
    assert result[1, 1, 1] == 1, "Position (1,1,1) should be 1"
    assert result[2, 2, 2] == 1, "Position (2,2,2) should be 1"
    
    print("✓ All positions verified correctly")
    
    print("\n" + "=" * 60)
    print("TEST 2: Realistic DICOM Volume")
    print("=" * 60)
    
    # Test with realistic DICOM dimensions
    target_shape = (295, 512, 512)
    
    # Create indices for a small region in the middle
    # Slice 100, row 256, columns 250-260
    indices = []
    slice_idx = 100
    row_idx = 256
    for col_idx in range(250, 261):
        flat_idx = slice_idx * (512 * 512) + row_idx * 512 + col_idx
        indices.append(flat_idx)
    
    print(f"Creating {len(indices)} indices in slice {slice_idx}")
    
    result = reconstruct_mask(indices, origin_slice_index=0, target_shape=target_shape)
    
    print(f"Result shape: {result.shape}")
    print(f"Non-zero voxels: {np.sum(result)}")
    
    # Verify the voxels are in the right slice
    for i in range(295):
        voxels_in_slice = np.sum(result[i])
        if voxels_in_slice > 0:
            print(f"  Slice {i}: {voxels_in_slice} voxels")
    
    assert np.sum(result) == len(indices), f"Expected {len(indices)} voxels, got {np.sum(result)}"
    assert np.sum(result[100]) == len(indices), f"All voxels should be in slice 100"
    
    print("✓ Realistic volume test passed")
    
    print("\n" + "=" * 60)
    print("TEST 3: Empty Indices")
    print("=" * 60)
    
    result = reconstruct_mask([], origin_slice_index=0, target_shape=(10, 10, 10))
    assert np.sum(result) == 0, "Empty indices should produce empty mask"
    print("✓ Empty indices test passed")
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    test_reconstruction()
