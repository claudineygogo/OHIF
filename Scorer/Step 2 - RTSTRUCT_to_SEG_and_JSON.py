import os
import sys
import glob
import argparse
import logging
import numpy as np
import pydicom
import json
import tkinter as tk
from tkinter import filedialog
import SimpleITK as sitk
from skimage import draw
from pathlib import Path
from highdicom.seg import (
    Segmentation,
    SegmentDescription,
    SegmentAlgorithmTypeValues,
)
from highdicom.content import (
    PixelMeasuresSequence,
    PlanePositionSequence,
    PlaneOrientationSequence,
)
from highdicom import AlgorithmIdentificationSequence
from pydicom.sr.codedict import codes
from pydicom.uid import generate_uid

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
LOG_DEBUG_COORDS = False

# ---------------------------------------------------------
# Part 1: Geometry Helpers (Shared/JSON Logic)
# ---------------------------------------------------------

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

    path_input = Path(input_dir)
    if not path_input.exists():
        return None, None, None

    # Scan all files to find CTs
    files = [f for f in path_input.iterdir() if f.is_file()]

    for f in files:
        try:
            # Fast header read
            ds = pydicom.dcmread(f, stop_before_pixels=True, force=True)
            if ds.Modality == 'CT':
                z = float(ds.ImagePositionPatient[2])
                z_positions.append(z)
                if dimensions is None:
                    dimensions = (ds.Rows, ds.Columns)
        except Exception as e:
            continue

    if not z_positions:
        return None, None, None

    # Sort Z positions (Image Position Patient Z)
    sorted_zs = sorted(list(set(z_positions)))

    # Store map for fast lookup with some tolerance
    z_map = {z: i for i, z in enumerate(sorted_zs)}

    logging.info(f"Reference Geometry: {len(sorted_zs)} slices. Range: {min(sorted_zs):.2f} to {max(sorted_zs):.2f}")

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

# ---------------------------------------------------------
# Part 2: RTSTRUCT to SEG Conversion Logic
# ---------------------------------------------------------

def find_dicom_series_in_dir(directory, target_series_uid=None):
    """
    Finds the DICOM series files in a directory using SimpleITK.
    """
    reader = sitk.ImageSeriesReader()
    try:
        series_ids = reader.GetGDCMSeriesIDs(directory)
    except Exception as e:
        logging.warning(f"Could not read series IDs from {directory}: {e}")
        return None, None, None

    if not series_ids:
        return None, None, None

    # If target UID is specified, look for it
    selected_series_id = None
    if target_series_uid:
        if target_series_uid in series_ids:
            selected_series_id = target_series_uid
        else:
            # Fallback: sometimes ITK Series IDs don't match standard UIDs perfectly
            # or the user wants us to guess. But strictly we should match.
            # Let's try to return the largest series if we can't find exact match,
            # BUT warning this might be wrong for multi-series folders.
            logging.warning(f"Target Series UID {target_series_uid} not found in ITK IDs: {series_ids}. Trying best guess.")
            # Heuristic: the series with most files is likely the CT volume
            max_files = 0
            best_id = None
            for sid in series_ids:
                fnames = reader.GetGDCMSeriesFileNames(directory, sid)
                if len(fnames) > max_files:
                    max_files = len(fnames)
                    best_id = sid
            selected_series_id = best_id
    else:
        selected_series_id = series_ids[0]

    dicom_names = reader.GetGDCMSeriesFileNames(directory, selected_series_id)
    reader.SetFileNames(dicom_names)

    try:
        itk_image = reader.Execute()
    except Exception as e:
        logging.error(f"Failed to load series {selected_series_id}: {e}")
        return None, None, None

    # Load source datasets for highdicom
    source_datasets = []
    for fname in dicom_names:
        try:
            ds = pydicom.dcmread(fname)
            source_datasets.append(ds)
        except Exception as e:
            logging.warning(f"Failed to read DICOM file {fname}: {e}")
            return None, None, None

    return itk_image, source_datasets, selected_series_id

def select_structures_gui(structure_info, file_name=""):
    """
    Opens a GUI window with checkboxes for each structure.
    structure_info: list of tuples (roi_number, roi_name)
    Returns: list of selected roi_numbers
    """
    if not structure_info:
        return []

    selected_roi_numbers = []

    # Create valid root
    root = tk.Tk()
    root.title(f"Select Structures - {os.path.basename(file_name)}")

    # Set window size and center
    window_width = 450
    window_height = 600
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x_c = int((screen_width/2) - (window_width/2))
    y_c = int((screen_height/2) - (window_height/2))
    root.geometry(f"{window_width}x{window_height}+{x_c}+{y_c}")

    # Instructions
    lbl = tk.Label(root, text=f"Select structures to convert from:\n{os.path.basename(file_name)}", wraplength=400, font=("Arial", 10, "bold"))
    lbl.pack(pady=10)

    # Frame for canvas (Scrollable list)
    frame_container = tk.Frame(root)
    frame_container.pack(fill="both", expand=True, padx=10, pady=5)

    canvas = tk.Canvas(frame_container)
    scrollbar = tk.Scrollbar(frame_container, orient="vertical", command=canvas.yview)
    scrollable_frame = tk.Frame(canvas)

    scrollable_frame.bind(
        "<Configure>",
        lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
    )

    canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
    canvas.configure(yscrollcommand=scrollbar.set)

    # Enable mouse wheel scrolling
    def _on_mousewheel(event):
        canvas.yview_scroll(int(-1*(event.delta/120)), "units")
    canvas.bind_all("<MouseWheel>", _on_mousewheel)

    canvas.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")

    # Checkboxes
    # use roi_number as key to ensure uniqueness
    check_vars = {}

    for roi_num, name in structure_info:
        display_text = f"{name} (ID: {roi_num})"
        var = tk.BooleanVar(value=False) # Default unchecked
        chk = tk.Checkbutton(scrollable_frame, text=display_text, variable=var, anchor='w')
        chk.pack(fill='x', padx=5, pady=2)
        check_vars[roi_num] = var

    def on_submit():
        for r_num, var in check_vars.items():
            if var.get():
                selected_roi_numbers.append(r_num)
        root.destroy()

    def select_all(state):
        for var in check_vars.values():
            var.set(state)

    # Button Area
    btn_frame = tk.Frame(root)
    btn_frame.pack(fill="x", pady=10, padx=10)

    tk.Button(btn_frame, text="Select All", command=lambda: select_all(True)).pack(side="left")
    tk.Button(btn_frame, text="Deselect All", command=lambda: select_all(False)).pack(side="left", padx=5)

    submit_btn = tk.Button(btn_frame, text="Convert Selected", command=on_submit, bg="#dddddd", font=("Arial", 9, "bold"))
    submit_btn.pack(side="right")

    root.mainloop()
    return selected_roi_numbers

def process_rtstruct(rtstruct_path, output_dir, target_roi_numbers=None):
    """
    Converts an RTSTRUCT file to multiple SEG files.
    Returns: list of paths to generated SEG files.
    """
    logging.info(f"Processing RTSTRUCT: {rtstruct_path}")
    generated_files = []

    try:
        rtstruct = pydicom.dcmread(rtstruct_path)
    except Exception as e:
        logging.error(f"Could not read RTSTRUCT {rtstruct_path}: {e}")
        return []

    if 'ReferencedFrameOfReferenceSequence' not in rtstruct:
        logging.error("RTSTRUCT missing ReferencedFrameOfReferenceSequence")
        return []

    # Extract Referenced Series UID
    ref_series_uid = None
    reference_frame_ref = rtstruct.ReferencedFrameOfReferenceSequence[0]
    if 'RTReferencedStudySequence' in reference_frame_ref:
        study_seq = reference_frame_ref.RTReferencedStudySequence[0]
        if 'RTReferencedSeriesSequence' in study_seq:
            ref_series_uid = study_seq.RTReferencedSeriesSequence[0].SeriesInstanceUID
        elif 'ReferencedSeriesSequence' in study_seq:
            ref_series_uid = study_seq.ReferencedSeriesSequence[0].SeriesInstanceUID

    if not ref_series_uid:
        logging.error("Could not determine Referenced Series Instance UID from RTSTRUCT")
        return []

    # Look for images in the same directory as RTSTRUCT
    input_dir = os.path.dirname(rtstruct_path)

    # Try finding series
    itk_image, source_datasets, loaded_series_uid = find_dicom_series_in_dir(input_dir, ref_series_uid)

    if itk_image is None:
        logging.error(f"Could not find Referenced Series {ref_series_uid} (or suitable fallback) in {input_dir}")
        return []

    width, height, depth = itk_image.GetSize()

    # Build Z-map from source datasets
    z_positions = []
    for ds in source_datasets:
        try:
            ipp = ds.ImagePositionPatient
            z = float(ipp[2])
            z_positions.append(z)
        except:
            z_positions.append(float('nan'))

    # Helper for specific conversion z-lookup
    def get_z_index_local(target_z, positions):
        best_idx = -1
        min_dist = float('inf')
        for idx, pos in enumerate(positions):
            if np.isnan(pos): continue
            dist = abs(target_z - pos)
            if dist < min_dist:
                min_dist = dist
                best_idx = idx
        return best_idx, min_dist

    # Get slice spacing for tolerance
    try:
        if len(z_positions) > 1:
            valid_zs = [z for z in z_positions if not np.isnan(z)]
            slice_spacing = abs(valid_zs[1] - valid_zs[0])
        else:
            slice_spacing = float(itk_image.GetSpacing()[2])
    except:
        slice_spacing = 2.0

    tolerance = slice_spacing * 0.55

    # Remove SpacingBetweenSlices from source datasets to prevent it from being added to the SEG
    # This matches the "Good" file structure and forces viewers to rely on explicit frame positions
    for ds in source_datasets:
        if 'SpacingBetweenSlices' in ds:
            del ds.SpacingBetweenSlices

    # Parse ROIs
    if 'ROIContourSequence' not in rtstruct:
        logging.warning("No ROIContourSequence in RTSTRUCT")
        return []

    roi_map = {}
    if 'StructureSetROISequence' in rtstruct:
        for roi in rtstruct.StructureSetROISequence:
            roi_map[roi.ROINumber] = roi

    for roi_contour in rtstruct.ROIContourSequence:
        roi_number = roi_contour.ReferencedROINumber
        if roi_number not in roi_map:
            continue

        roi_name = roi_map[roi_number].ROIName

        # Filter if user selected specific ROIs
        if target_roi_numbers is not None and roi_number not in target_roi_numbers:
            logging.info(f"  Skipping {roi_name} (ID: {roi_number}) - Not selected")
            continue

        if not hasattr(roi_contour, 'ContourSequence'):
            continue

        # Create mask for this ROI
        mask_array = np.zeros((depth, height, width), dtype=np.uint8)
        has_data = False

        for contour in roi_contour.ContourSequence:
            if not hasattr(contour, 'ContourData'):
                continue

            points_flat = contour.ContourData
            points = np.array(points_flat).reshape(-1, 3)

            # Determine Z-index
            contour_z = points[0][2]
            z_idx, dist = get_z_index_local(contour_z, z_positions)

            if dist > tolerance:
                continue

            # Get X,Y indices using ITK
            indices = [itk_image.TransformPhysicalPointToContinuousIndex(p) for p in points]
            r_coords = [p[1] for p in indices]
            c_coords = [p[0] for p in indices]

            # Rasterize
            rr, cc = draw.polygon(r_coords, c_coords, shape=(height, width))
            mask_array[z_idx, rr, cc] = 1
            has_data = True

        if not has_data:
            logging.warning(f"  ROI {roi_name} empty. Skipping.")
            continue

        logging.info(f"  Generated mask for: {roi_name}")

        # Create SEG
        segment_description = SegmentDescription(
            segment_number=1,
            segment_label=roi_name,
            segmented_property_category=codes.SCT.Organ,
            segmented_property_type=codes.SCT.Organ,
            algorithm_type=SegmentAlgorithmTypeValues.MANUAL,
            algorithm_identification=AlgorithmIdentificationSequence(
                name="RTSTRUCT2SEG",
                version="1.0",
                family=codes.DCM.ArtificialIntelligence,
            ),
        )

        try:
            seg_dataset = Segmentation(
                source_images=source_datasets,
                pixel_array=mask_array,
                segmentation_type="BINARY",
                segment_descriptions=[segment_description],
                series_instance_uid=generate_uid(),
                series_number=100 + roi_number,
                sop_instance_uid=generate_uid(),
                instance_number=1,
                manufacturer="Custom RTSTRUCT Converter",
                manufacturer_model_name="RTSTRUCT2SEG",
                software_versions="0.1",
                device_serial_number="123456",
            )

            seg_dataset.SeriesDescription = roi_name

            safe_roi_name = "".join([c for c in roi_name if c.isalnum() or c in (' ', '_', '-')]).strip()
            out_filename = f"{safe_roi_name}.dcm"
            out_path = os.path.join(output_dir, out_filename)

            seg_dataset.save_as(out_path)
            logging.info(f"  Saved SEG: {out_filename}")
            generated_files.append(out_path)

        except Exception as e:
            logging.error(f"  Failed to save SEG for {roi_name}: {e}")

    return generated_files

# ---------------------------------------------------------
# Part 3: SEG to JSON Conversion Logic
# ---------------------------------------------------------

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

    # Handle single frame
    if len(pixel_array.shape) == 2:
        pixel_array = pixel_array[np.newaxis, :, :]

    num_frames = pixel_array.shape[0]

    if ref_dims:
       current_slice_size = pixel_array.shape[1] * pixel_array.shape[2]
       ref_slice_size = ref_dims[0] * ref_dims[1]
       if current_slice_size != ref_slice_size:
           logging.warning(f"Dimension mismatch for {dcm_path}. Expected {ref_dims}. Skipping.")
           return None, None, None
    else:
       ref_dims = (512, 512)

    slice_size = ref_dims[0] * ref_dims[1]
    global_indices = []

    if not hasattr(dcm, 'PerFrameFunctionalGroupsSequence'):
        logging.warning(f"SEG {dcm_path} missing PerFrameFunctionalGroupsSequence.")
        return None, None, None

    pffgs = dcm.PerFrameFunctionalGroupsSequence

    if len(pffgs) != num_frames:
        logging.warning(f"Frame count mismatch in {dcm_path}.")
        return None, None, None

    for i in range(num_frames):
        try:
            plane_pos = pffgs[i].PlanePositionSequence[0].ImagePositionPatient
            frame_z = float(plane_pos[2])
        except Exception as e:
            continue

        slice_idx = find_nearest_z_index(frame_z, sorted_zs)

        if slice_idx is None:
            logging.warning(f"Frame {i} Z={frame_z} not found in reference geometry. Skipping.")
            continue

        frame_mask = pixel_array[i].astype(bool)
        local_indices = np.flatnonzero(frame_mask)

        global_offset = slice_idx * slice_size

        if len(local_indices) > 0:
            frame_global_indices = local_indices + global_offset
            global_indices.extend(frame_global_indices.tolist())

    patient_id = dcm.PatientID if 'PatientID' in dcm else "UnknownPatient"

    structure_name = "UnknownStructure"
    if 'SeriesDescription' in dcm and dcm.SeriesDescription:
        structure_name = dcm.SeriesDescription
    elif 'ContentLabel' in dcm:
        structure_name = dcm.ContentLabel

    safe_patient_id = "".join([c for c in patient_id if c.isalnum() or c in (' ', '_', '-')]).strip()
    safe_structure_name = "".join([c for c in structure_name if c.isalnum() or c in (' ', '_', '-')]).strip()

    return safe_patient_id, safe_structure_name, global_indices

# ---------------------------------------------------------
# Part 4: Orchestration
# ---------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Convert RTSTRUCT to SEG, then SEG to JSON Reference.")
    parser.add_argument("input_dir", nargs="?", default=None, help="Directory containing Images and RTSTRUCT")
    parser.add_argument("--references_dir", default="References", help="Output directory for JSON files (relative to script or absolute)")

    args = parser.parse_args()

    # -------------------------------------------------------------------------
    # FOLDER SELECTION
    # -------------------------------------------------------------------------
    script_dir = Path(__file__).parent.absolute()

    if args.input_dir:
        input_dir = Path(args.input_dir).absolute()
    else:
        # Set default directory
        default_data_dir = script_dir / "Data to be converted"

        # Ensure default dir variable is valid for initialdir even if it doesn't exist on disk yet
        # (though usually better if it exists)
        if not default_data_dir.exists():
             default_data_dir = script_dir

        logging.info("Opening folder selection dialog...")

        try:
            root = tk.Tk()
            root.withdraw()  # Hide the main window
            root.attributes('-topmost', True)  # Bring to front

            selected_dir = filedialog.askdirectory(
                title="Select data folder to convert",
                initialdir=default_data_dir,
                mustexist=True
            )

            root.destroy()

            if selected_dir:
                input_dir = Path(selected_dir).absolute()
                logging.info(f"Selected input directory: {input_dir}")
            else:
                logging.warning("No folder selected. Exiting.")
                return

        except Exception as e:
            logging.error(f"Error opening folder dialog: {e}")
            logging.info("Please explicitly provide input directory as an argument.")
            return

    if not input_dir.exists():
        logging.error(f"Input directory not found: {input_dir}")
        return

    # Check if references dir is absolute or relative
    if os.path.isabs(args.references_dir):
        references_base_dir = Path(args.references_dir)
    else:
        # Default to script dir / References if relative
        references_base_dir = script_dir / args.references_dir

    logging.info(f"Scanning: {input_dir}")
    logging.info(f"Target JSON Directory: {references_base_dir}")

    # 1. Scan for RTSTRUCTs
    rtstruct_files = []
    files_to_scan = [f for f in input_dir.iterdir() if f.is_file()]

    for f in files_to_scan:
        try:
            ds = pydicom.dcmread(f, stop_before_pixels=True, force=True)
            if ds.SOPClassUID == '1.2.840.10008.5.1.4.1.1.481.3':
                rtstruct_files.append(f)
        except:
            pass

    if not rtstruct_files:
        logging.warning("No RTSTRUCT files found in directory.")
        return

    logging.info(f"Found {len(rtstruct_files)} RTSTRUCT files.")

    # 2. Process RTSTRUCTs
    all_generated_segs = []

    for rts in rtstruct_files:
        # 2a. Pre-scan for Structure Names to allow User Selection
        selected_roi_numbers = None
        try:
            # We must read without stop_before_pixels sometimes to ensure we get all sequences
            # properly, though normally StructureSetROI works fine.
            # Changed to force=True and removed stop_before_pixels to be safe.
            temp_ds = pydicom.dcmread(rts, force=True)

            structure_info = [] # List of tuples (number, name)

            if 'StructureSetROISequence' in temp_ds:
                for roi_item in temp_ds.StructureSetROISequence:
                    try:
                        r_num = roi_item.ROINumber
                        r_name = roi_item.get("ROIName", f"Unnamed_ROI_{r_num}")
                        structure_info.append((r_num, r_name))
                    except Exception:
                        continue

                # Sort by name for nicer display
                structure_info.sort(key=lambda x: x[1])

                if structure_info:
                     selected_roi_numbers = select_structures_gui(structure_info, str(rts))
                     if not selected_roi_numbers:
                         logging.warning(f"No structures selected for {rts.name}. Skipping file.")
                         continue
            else:
                 logging.warning(f"No StructureSetROISequence in {rts.name}")
        except Exception as e:
            logging.error(f"Error reading structure names from {rts}: {e}")

        # 2b. Process with selection
        generated = process_rtstruct(str(rts), str(input_dir), target_roi_numbers=selected_roi_numbers)
        all_generated_segs.extend(generated)

    if not all_generated_segs:
        logging.warning("No SEG files were generated. Exiting.")
        return

    logging.info(f"Successfully generated {len(all_generated_segs)} SEG files.")

    # 3. Build Reference Geometry for JSON conversion
    logging.info("Building Reference Geometry for JSON conversion...")
    z_map, sorted_zs, ref_dims = load_reference_geometry(input_dir)

    if not sorted_zs:
        logging.error("Failed to build reference geometry from CT files. Cannot create JSONs.")
        return

    # 4. Convert SEGs to JSON
    logging.info("Converting Generated SEGs to JSON...")

    for seg_path in all_generated_segs:
        if not os.path.exists(seg_path):
            continue

        result = get_indices_from_seg(seg_path, z_map, sorted_zs, ref_dims)
        if not result:
            logging.warning(f"Could not extract indices from {seg_path}")
            continue

        patient_id, structure_name, indices = result

        if indices is not None and len(indices) > 0:
            patient_dir = references_base_dir / patient_id
            patient_dir.mkdir(parents=True, exist_ok=True)

            output_json = patient_dir / f"{structure_name}.json"

            indices.sort()

            data = {
                "non_zero_indices": indices,
                "origin_slice_index": 0
            }

            with open(output_json, 'w') as f:
                json.dump(data, f)

            logging.info(f"Created JSON: {output_json} ({len(indices)} voxels)")

    logging.info("Validation processing complete.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logging.error(f"Critical Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        pass
