import os
import pydicom
import argparse
import sys

def optimize_dataset(input_dir, output_dir, stride=2):
    if not os.path.isdir(input_dir):
        print(f"Error: Input directory '{input_dir}' does not exist.")
        sys.exit(1)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created output directory: {output_dir}")

    # 1. Read all DICOM files
    dicom_files = []
    for f in os.listdir(input_dir):
        full_path = os.path.join(input_dir, f)
        if os.path.isfile(full_path) and not f.endswith('.py') and not f.endswith('.json'):
             try:
                ds = pydicom.dcmread(full_path, stop_before_pixels=True)
                # We need ImagePositionPatient for sorting
                if "ImagePositionPatient" in ds:
                    z_pos = ds.ImagePositionPatient[2]
                    dicom_files.append((z_pos, full_path))
                else:
                    print(f"Skipping {f}: No ImagePositionPatient tag.")
             except Exception as e:
                 print(f"Skipping {f}: {e}")

    # 2. Sort by Z-position to ensure correct order
    # DICOM Z-order can be ascending or descending, but as long as it's sorted, decimation works.
    dicom_files.sort(key=lambda x: x[0])

    total_files = len(dicom_files)
    print(f"Found {total_files} DICOM files.")

    # 3. Decimate
    kept_files = dicom_files[::stride]
    print(f"Decimating with stride {stride}. Keeping {len(kept_files)} files.")

    # 4. Process and Save
    for i, (_, src_path) in enumerate(kept_files):
        ds = pydicom.dcmread(src_path)

        # Update Spacing/Thickness tags if present
        # If we take every 2nd slice, the physical distance between slices doubles.
        if "SpacingBetweenSlices" in ds:
            original_spacing = float(ds.SpacingBetweenSlices)
            ds.SpacingBetweenSlices = original_spacing * stride

        if "SliceThickness" in ds:
            # Thickness technically describes the acquired slice width, not spacing.
            # However, in many viewers, increasing gap without increasing thickness description *might* cause issues
            # or it might be fine. Usually SpacingBetweenSlices is the critical one for volume reconstruction.
            # We will update it to reflect the new "gap" coverage if they were contiguous.
            original_thickness = float(ds.SliceThickness)
            ds.SliceThickness = original_thickness * stride

        # Save to new location
        filename = os.path.basename(src_path)
        dst_path = os.path.join(output_dir, filename)
        ds.save_as(dst_path)

    print(f"Done. Optimized dataset saved to: {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Decimate DICOM dataset to reduce memory usage.")
    parser.add_argument("--input", required=True, help="Path to source DICOM directory")
    parser.add_argument("--output", required=True, help="Path to destination directory")
    parser.add_argument("--stride", type=int, default=2, help="Decimation stride (default: 2)")

    args = parser.parse_args()

    optimize_dataset(args.input, args.output, args.stride)
