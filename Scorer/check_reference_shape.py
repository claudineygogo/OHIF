import pydicom
import numpy as np

# Load the reference file to check its shape
reference_file = 'Reference Seg (brain)'
dcm = pydicom.dcmread(reference_file)
mask = dcm.pixel_array

print(f"Reference mask shape: {mask.shape}")
print(f"Reference mask dtype: {mask.dtype}")
print(f"Total voxels: {mask.size}")
print(f"Dimensions: {len(mask.shape)}D")

# Calculate what the dimensions should be
if len(mask.shape) == 3:
    frames, rows, cols = mask.shape
    print(f"\nFrames (slices): {frames}")
    print(f"Rows (height): {rows}")
    print(f"Columns (width): {cols}")
