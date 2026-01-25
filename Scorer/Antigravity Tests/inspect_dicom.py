import pydicom
import numpy as np

# Inspect the DICOM segmentation files
files = ['User Seg (Brain)', 'Reference Seg (brain)']

for filename in files:
    print(f"\n{'='*60}")
    print(f"Inspecting DICOM file: {filename}")
    print('='*60)
    
    try:
        # Read DICOM file
        dcm = pydicom.dcmread(filename)
        
        print(f"\nSOPClassUID: {dcm.SOPClassUID}")
        print(f"Modality: {dcm.get('Modality', 'N/A')}")
        
        # Check if it's a segmentation object
        if hasattr(dcm, 'SegmentSequence'):
            print(f"\n[SEGMENTATION OBJECT DETECTED]")
            print(f"Number of segments: {len(dcm.SegmentSequence)}")
            
            for i, segment in enumerate(dcm.SegmentSequence):
                print(f"\n  Segment {i+1}:")
                print(f"    Label: {segment.get('SegmentLabel', 'N/A')}")
                print(f"    Number: {segment.get('SegmentNumber', 'N/A')}")
        
        # Try to get pixel data
        if hasattr(dcm, 'pixel_array'):
            pixel_data = dcm.pixel_array
            print(f"\nPixel Data:")
            print(f"  Shape: {pixel_data.shape}")
            print(f"  Dtype: {pixel_data.dtype}")
            print(f"  Min: {pixel_data.min()}, Max: {pixel_data.max()}")
            print(f"  Unique values: {np.unique(pixel_data)[:20]}")
        else:
            print("\n[WARNING] No pixel_array attribute found")
            
            # Check for PixelData
            if hasattr(dcm, 'PixelData'):
                print(f"  PixelData exists (length: {len(dcm.PixelData)} bytes)")
                print(f"  Rows: {dcm.get('Rows', 'N/A')}")
                print(f"  Columns: {dcm.get('Columns', 'N/A')}")
                print(f"  NumberOfFrames: {dcm.get('NumberOfFrames', 'N/A')}")
        
        # Additional metadata
        print(f"\nAdditional Info:")
        print(f"  Rows: {dcm.get('Rows', 'N/A')}")
        print(f"  Columns: {dcm.get('Columns', 'N/A')}")
        print(f"  NumberOfFrames: {dcm.get('NumberOfFrames', 'N/A')}")
        print(f"  BitsAllocated: {dcm.get('BitsAllocated', 'N/A')}")
        print(f"  SamplesPerPixel: {dcm.get('SamplesPerPixel', 'N/A')}")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to read DICOM file: {e}")
        import traceback
        traceback.print_exc()
