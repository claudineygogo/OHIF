"""
Verify the DICOM-based Dice Score calculation manually.
"""
from scorer import load_segmentation_mask, dice_score
import numpy as np

print("="*60)
print("DICOM Dice Score Verification")
print("="*60)

# Load masks
print("\nLoading DICOM segmentation files...")
user_mask = load_segmentation_mask('User Seg (Brain)')
ref_mask = load_segmentation_mask('Reference Seg (brain)')

print(f"\nUser mask shape: {user_mask.shape}")
print(f"Reference mask shape: {ref_mask.shape}")

print(f"\nUser mask - Non-zero voxels: {np.sum(user_mask > 0)}")
print(f"Reference mask - Non-zero voxels: {np.sum(ref_mask > 0)}")

# Calculate score using file paths
print("\n--- Method 1: Using file paths ---")
score1 = dice_score('Reference Seg (brain)', 'User Seg (Brain)')
print(f"Dice Score: {score1:.6f}")

# Calculate score using loaded arrays
print("\n--- Method 2: Using loaded arrays ---")
score2 = dice_score(ref_mask, user_mask)
print(f"Dice Score: {score2:.6f}")

print(f"\n--- Verification ---")
print(f"Scores match: {abs(score1 - score2) < 0.0001}")
print(f"Final Dice Score: {score1:.6f}")
print("="*60)
