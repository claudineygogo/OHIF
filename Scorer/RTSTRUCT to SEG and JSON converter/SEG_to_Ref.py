import os
import pydicom
import numpy as np
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def load_reference_geometry(input_dir):
    """
    Scans for CT files to build a map of Z-position to Slice Index.
    Returns:
        z_map (dict): { z_position (float): slice_index (int) }
        sorted_zs (list): List of Z positions
        dimensions (tuple): (Rows, Columns)
    """
    z_positions = []
    dimensions = None

    files = list(input_dir.glob("*.dcm"))

    for f in files:
        try:
            # Fast header read
            ds = pydicom.dcmread(f, stop_before_pixels=True)
            if ds.Modality == 'CT':
                z = float(ds.ImagePositionPatient[2])
                z_positions.append(z)
                if dimensions is None:
                    dimensions = (ds.Rows, ds.Columns)
        except Exception as e:
            continue

    if not z_positions:
        logging.error("No CT files found to establish reference geometry!")
        return None, None, None

    # Sort Z positions (Image Position Patient Z)
    # This determines the slice index (0 is bottom-most usually or top-most depending on scan)
    sorted_zs = sorted(list(set(z_positions)))

    # Store map for fast lookup with some tolerance
    z_map = {z: i for i, z in enumerate(sorted_zs)}

    logging.info(f"Reference Volume: {len(sorted_zs)} slices. Z range: {min(sorted_zs):.2f} to {max(sorted_zs):.2f}")

    return z_map, sorted_zs, dimensions

def find_nearest_z_index(target_z, sorted_zs, tolerance=0.5):
    """Finds the index of the nearest Z position."""
    best_idx = -1
    min_dist = float('inf')

    for i, z in enumerate(sorted_zs):
        dist = abs(z - target_z)
        if dist < min_dist:
            min_dist = dist
            best_idx = i

    if min_dist > tolerance:
        return None
    return best_idx

def get_indices_from_seg(dcm_path, z_map, sorted_zs, ref_dims):
    """
    Reads a DICOM SEG file and maps its frames to global indices.
    """
    try:
        dcm = pydicom.dcmread(dcm_path)
    except Exception as e:
        logging.error(f"Failed to read DICOM {dcm_path}: {e}")
        return None, None, None

    # Check for Segmentation Storage
    if dcm.SOPClassUID != '1.2.840.10008.5.1.4.1.1.66.4':
        return None, None, None

    pixel_array = dcm.pixel_array

    # Handle 2D vs 3D shapes
    if len(pixel_array.shape) == 2:
        # Single frame
        pixel_array = pixel_array[np.newaxis, :, :]

    num_frames = pixel_array.shape[0]

    if ref_dims:
       current_slice_size = pixel_array.shape[1] * pixel_array.shape[2]
       ref_slice_size = ref_dims[0] * ref_dims[1]
       if current_slice_size != ref_slice_size:
           logging.warning(f"Dimension mismatch for {dcm_path}. Expected {ref_dims}. Skipping.")
           return None, None, None
    else:
       # Fallback if no CTs found (shouldn't happen given logic)
       ref_dims = (512, 512)

    slice_size = ref_dims[0] * ref_dims[1]
    global_indices = []

    # PerFrameFunctionalGroupsSequence logic
    if not hasattr(dcm, 'PerFrameFunctionalGroupsSequence'):
        logging.warning(f"SEG {dcm_path} missing PerFrameFunctionalGroupsSequence. Cannot determine slice offsets.")
        return None, None, None

    pffgs = dcm.PerFrameFunctionalGroupsSequence

    if len(pffgs) != num_frames:
        logging.warning(f"Frame count mismatch in {dcm_path}. Pixels: {num_frames}, Meta: {len(pffgs)}")
        return None, None, None

    for i in range(num_frames):
        # Extract Z for this frame
        try:
            # Standard DICOM SEG location
            plane_pos = pffgs[i].PlanePositionSequence[0].ImagePositionPatient
            frame_z = float(plane_pos[2])
        except Exception as e:
            logging.warning(f"Could not extract Z for frame {i} in {dcm_path}: {e}")
            continue

        # Find global slice index
        # Use nearest neighbor search against the sorted CT slice positions
        slice_idx = find_nearest_z_index(frame_z, sorted_zs)

        if slice_idx is None:
            logging.warning(f"Frame {i} Z={frame_z} not found in reference volume geometry. Skipping.")
            continue

        # Get flattened indices for this frame
        frame_mask = pixel_array[i].astype(bool)
        local_indices = np.flatnonzero(frame_mask)

        # Determine offset for this slice in the global volume
        global_offset = slice_idx * slice_size

        # Add to global list
        if len(local_indices) > 0:
            frame_global_indices = local_indices + global_offset
            global_indices.extend(frame_global_indices.tolist())

    # Extract Metadata
    patient_id = dcm.PatientID if 'PatientID' in dcm else "UnknownPatient"

    structure_name = "UnknownStructure"
    if 'SeriesDescription' in dcm and dcm.SeriesDescription:
        structure_name = dcm.SeriesDescription
    elif 'ContentLabel' in dcm:
        structure_name = dcm.ContentLabel

    # Sanitize
    safe_patient_id = "".join([c for c in patient_id if c.isalnum() or c in (' ', '_', '-')]).strip()
    safe_structure_name = "".join([c for c in structure_name if c.isalnum() or c in (' ', '_', '-')]).strip()

    return safe_patient_id, safe_structure_name, global_indices

def main():
    script_dir = Path(__file__).parent.absolute()
    input_dir = script_dir / "Data to be converted"
    output_base_dir = script_dir / "References"

    if not input_dir.exists():
        logging.error(f"Input directory not found: {input_dir}")
        return

    # 1. Build Reference Geometry
    logging.info("Scanning for CT files to build reference geometry...")
    z_map, sorted_zs, ref_dims = load_reference_geometry(input_dir)

    if not sorted_zs:
        logging.error("Could not build reference geometry. Aborting.")
        return

    logging.info(f"Geometry established. Dimensions: {ref_dims}, Slices: {len(sorted_zs)}")

    # 2. Convert SEGs
    count = 0
    for file_path in input_dir.glob("*.dcm"):
        # Skipping CT files within the conversion loop is done inside get_indices check class UID
        # But we can optimize by filename if needed.

        result = get_indices_from_seg(file_path, z_map, sorted_zs, ref_dims)
        if not result:
            continue

        patient_id, structure_name, indices = result

        if indices is not None:
            # Create output directory
            patient_dir = output_base_dir / patient_id
            patient_dir.mkdir(parents=True, exist_ok=True)

            output_json = patient_dir / f"{structure_name}.json"

            # Sort indices
            indices.sort()

            data = {
                "non_zero_indices": indices,
                "origin_slice_index": 0
            }

            with open(output_json, 'w') as f:
                json.dump(data, f)

            logging.info(f"Converted {file_path.name} -> {output_json} ({len(indices)} voxels)")
            count += 1

    logging.info(f"Done. Converted {count} SEG files.")

if __name__ == "__main__":
    main()
