import numpy as np
import pydicom

# Load reference mask
reference_file = 'Reference Seg (brain)'
dcm = pydicom.dcmread(reference_file)
ref_mask = dcm.pixel_array

print("=== REFERENCE MASK ===")
print(f"Shape: {ref_mask.shape}")
print(f"Total voxels: {ref_mask.size}")
print(f"Non-zero voxels: {np.sum(ref_mask > 0)}")
print(f"Unique values: {np.unique(ref_mask)}")

# Check which slices have segmentation data
slices_with_data = []
for i in range(ref_mask.shape[0]):
    if np.sum(ref_mask[i]) > 0:
        slices_with_data.append(i)
        
print(f"\nSlices with segmentation data: {len(slices_with_data)}")
print(f"Slice indices: {slices_with_data}")

if slices_with_data:
    print(f"First slice with data: {slices_with_data[0]}")
    print(f"Last slice with data: {slices_with_data[-1]}")
    print(f"Range: {slices_with_data[-1] - slices_with_data[0] + 1} slices")
