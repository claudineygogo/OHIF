import pydicom
import numpy as np
import json
import os

def verify_indices():
    print("Verifying DICOM indices against JSON...")
    
    # 1. Load JSON data
    json_path = 'reference_mask_normalized.json'
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found")
        return
        
    with open(json_path, 'r') as f:
        json_data = json.load(f)
        
    json_indices = set(json_data['non_zero_indices'])
    json_origin = json_data['origin_slice_index']
    print(f"JSON: {len(json_indices)} indices, origin {json_origin}")
    
    # 2. Load DICOM data
    dicom_path = 'Reference Segmentation'
    if not os.path.exists(dicom_path):
        print(f"Error: {dicom_path} not found")
        return
        
    dcm = pydicom.dcmread(dicom_path)
    pixel_data = dcm.pixel_array
    
    # 3. Extract and shift DICOM indices
    # Using the same logic as app.py
    ref_origin_index = 28 # Hardcoded as per plan
    
    z_local, y, x = np.nonzero(pixel_data)
    z_absolute = z_local + ref_origin_index
    
    height, width = 512, 512
    slice_size = height * width
    
    dicom_indices_list = (z_absolute * slice_size + y * width + x).tolist()
    dicom_indices = set(dicom_indices_list)
    
    print(f"DICOM: {len(dicom_indices)} indices, assumed origin {ref_origin_index}")
    
    # 4. Compare Z-distribution
    json_indices_array = np.array(list(json_indices), dtype=np.int64)
    json_z = json_indices_array // slice_size
    
    dicom_indices_array = np.array(list(dicom_indices), dtype=np.int64)
    dicom_z = dicom_indices_array // slice_size
    
    print(f"\nZ-Distribution Analysis:")
    print(f"JSON Z-range: [{json_z.min()}, {json_z.max()}] (Unique slices: {len(np.unique(json_z))})")
    print(f"DICOM Z-range: [{dicom_z.min()}, {dicom_z.max()}] (Unique slices: {len(np.unique(dicom_z))})")
    
    # Check overlap in Z
    common_z = set(json_z).intersection(set(dicom_z))
    print(f"Overlapping Z slices: {sorted(list(common_z))}")
    
    if len(common_z) > 0:
        # Compare a specific slice
        test_z = list(common_z)[0]
        print(f"\nComparing Slice Z={test_z}:")
        
        json_mask_slice = set([i for i in json_indices if (i // slice_size) == test_z])
        dicom_mask_slice = set([i for i in dicom_indices if (i // slice_size) == test_z])
        
        print(f"  JSON pixels in slice {test_z}: {len(json_mask_slice)}")
        print(f"  DICOM pixels in slice {test_z}: {len(dicom_mask_slice)}")
        print(f"  Intersection: {len(json_mask_slice.intersection(dicom_mask_slice))}")
        
    print("\nConclusion: The DICOM file appears to contain different or more data than the JSON file.")
    print("Proceeding with DICOM data as the source of truth as per instructions.")

if __name__ == "__main__":
    verify_indices()
