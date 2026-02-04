import os
import pydicom
import argparse
import numpy as np
from PIL import Image
import uuid

def generate_uid(prefix="1.2.826.0.1.3680043.2.1125."):
    """Generates a unique UID."""
    return prefix + str(uuid.uuid4().int)

def load_dicom_series(input_dir):
    """Loads DICOM files from a directory and sorts them by ImagePositionPatient Z."""
    files = []
    for f in os.listdir(input_dir):
        filepath = os.path.join(input_dir, f)
        if os.path.isfile(filepath):
            try:
                ds = pydicom.dcmread(filepath)
                if hasattr(ds, "ImagePositionPatient"):
                    files.append((ds.ImagePositionPatient[2], ds, filepath))
            except:
                pass

    # Sort by Z-position
    files.sort(key=lambda x: x[0])
    return [x[1] for x in files]

def save_dicom_series(datasets, output_dir, prefix=""):
    """Saves a list of DICOM datasets to the output directory."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for i, ds in enumerate(datasets):
        # Generate new SOPInstanceUID
        ds.SOPInstanceUID = generate_uid()
        ds.file_meta.MediaStorageSOPInstanceUID = ds.SOPInstanceUID

        # Add prefix to SeriesDescription to indicate modification
        if hasattr(ds, "SeriesDescription"):
            if prefix and prefix not in ds.SeriesDescription:
                ds.SeriesDescription = f"{prefix} {ds.SeriesDescription}"

        filename = f"IMG-{i+1:04d}.dcm"
        ds.save_as(os.path.join(output_dir, filename))

# --- Techniques ---

def apply_decimation(datasets, stride=2):
    """Decimates the dataset by keeping every N-th slice."""
    decimated = datasets[::stride]

    for ds in decimated:
        # Adjust spacing
        if hasattr(ds, "SpacingBetweenSlices"):
            ds.SpacingBetweenSlices = float(ds.SpacingBetweenSlices) * stride
        if hasattr(ds, "SliceThickness"):
            ds.SliceThickness = float(ds.SliceThickness) * stride

    # Update Instance Numbers
    for i, ds in enumerate(decimated):
        ds.InstanceNumber = i + 1

    return decimated

def apply_8bit_quantization(datasets, window_width=400, window_level=40):
    """Converts 16-bit pixel data to 8-bit using specified windowing."""
    processed = []

    for ds in datasets:
        # Ensure we have pixel data
        if not hasattr(ds, "PixelData"):
            processed.append(ds)
            continue

        original_array = ds.pixel_array.astype(np.float32)

        # Rescale Slope/Intercept handling
        slope = getattr(ds, 'RescaleSlope', 1)
        intercept = getattr(ds, 'RescaleIntercept', 0)
        hu_image = original_array * slope + intercept

        # Apply Window
        min_val = window_level - (window_width / 2)
        max_val = window_level + (window_width / 2)

        hu_image = np.clip(hu_image, min_val, max_val)

        # Normalize to 0-255
        hu_image = ((hu_image - min_val) / (max_val - min_val)) * 255.0
        uint8_image = hu_image.astype(np.uint8)

        # Update Dataset
        ds.PixelData = uint8_image.tobytes()
        ds.Rows, ds.Columns = uint8_image.shape
        ds.BitsAllocated = 8
        ds.BitsStored = 8
        ds.HighBit = 7
        ds.SamplesPerPixel = 1
        ds.PixelRepresentation = 0 # unsigned integer

        # Remove Rescale tags as data is now baked
        if "RescaleSlope" in ds: del ds.RescaleSlope
        if "RescaleIntercept" in ds: del ds.RescaleIntercept
        if "WindowCenter" in ds: del ds.WindowCenter
        if "WindowWidth" in ds: del ds.WindowWidth

        processed.append(ds)

    return processed

def apply_resizing(datasets, size=(256, 256)):
    """Resizes pixel data to the target resolution using PIL."""
    processed = []
    target_rows, target_cols = size

    for ds in datasets:
        if not hasattr(ds, "PixelData"):
            processed.append(ds)
            continue

        original_array = ds.pixel_array
        original_rows = ds.Rows
        original_cols = ds.Columns

        # Resizing using PIL
        # Handle different bit depths. Since we usually do this after 8-bit conv, we optimize for that.
        # But for general safety, we check.
        if ds.BitsAllocated == 8:
             mode = 'L'
             arr = original_array.astype(np.uint8)
             img = Image.fromarray(arr, mode=mode)
             resized_img = img.resize((target_cols, target_rows), Image.BILINEAR)
             resized_array = np.array(resized_img)
        else:
             # For 16-bit, PIL 'I;16' is often unsigned.
             # We will try to map to float, resize, and map back if we truly wanted to support 16-bit resizing.
             # But the user asked for 8-bit + Resizing in the "Ultra-Light" combo, so 8-bit logic is primary.
             # If standalone resizing is called on 16-bit, we warn or do basic nearest if PIL issues arise.
             # Let's try float conversion which is safe.
             arr = original_array.astype(np.float32)
             img = Image.fromarray(arr) # PIL mode 'F'
             resized_img = img.resize((target_cols, target_rows), Image.BILINEAR)
             resized_array = np.array(resized_img).astype(original_array.dtype)

        # Update Pixel Data
        ds.PixelData = resized_array.tobytes()
        ds.Rows = target_rows
        ds.Columns = target_cols

        # Check logic: if downsampling by 2 (512->256), pixel spacing doubles using original dims
        row_factor = original_rows / target_rows
        col_factor = original_cols / target_cols

        if hasattr(ds, "PixelSpacing"):
            # PixelSpacing is [RowSpacing, ColSpacing] (vertical, horizontal)
            ds.PixelSpacing = [float(ds.PixelSpacing[0]) * row_factor, float(ds.PixelSpacing[1]) * col_factor]

        if hasattr(ds, "ImagerPixelSpacing"):
             ds.ImagerPixelSpacing = [float(ds.ImagerPixelSpacing[0]) * row_factor, float(ds.ImagerPixelSpacing[1]) * col_factor]

        processed.append(ds)

    return processed

def main():
    parser = argparse.ArgumentParser(description="DICOM Modular Optimizer")
    parser.add_argument("--input", required=True, help="Input directory")
    parser.add_argument("--output", required=True, help="Output directory")
    parser.add_argument("--mode", choices=['decimate', '8bit', 'resize'], required=True, help="Optimization mode")

    args = parser.parse_args()

    print(f"Loading data from {args.input}...")
    datasets = load_dicom_series(args.input)
    print(f"Loaded {len(datasets)} slices.")

    if args.mode == 'decimate':
        print("Applying Decimation...")
        datasets = apply_decimation(datasets)
    elif args.mode == '8bit':
        print("Applying 8-bit Quantization...")
        datasets = apply_8bit_quantization(datasets)
    elif args.mode == 'resize':
        print("Applying Usage Resizing (256x256)...")
        datasets = apply_resizing(datasets)

    print(f"Saving to {args.output}...")
    save_dicom_series(datasets, args.output, prefix=f"[{args.mode.upper()}]")
    print("Done.")

if __name__ == "__main__":
    main()
