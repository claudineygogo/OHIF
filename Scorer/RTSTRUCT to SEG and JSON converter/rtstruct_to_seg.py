
import os
import sys
import glob
import argparse
import logging
import numpy as np
import pydicom
import SimpleITK as sitk
from skimage import draw
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
LOG_DEBUG_COORDS = False # validation for rasterization

def find_dicom_series_in_dir(directory, target_series_uid=None):
    """
    Finds the DICOM series files in a directory.
    If target_series_uid is provided, only returns files matching that UID.
    Returns: (sitk_image, list_of_pydicom_datasets, series_uid)
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
            # Maybe the images are not strictly in this dir but identifiable?
            # For now return None
            return None, None, None
    else:
        # Heuristic: pick the series with the most files (likely the volume) 
        # or just the first one suitable for being a Reference.
        # But usually we want the one referenced by RTSTRUCT.
        # If this function is called without target UID, it's a guess.
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

def process_rtstruct(rtstruct_path, output_dir):
    logging.info(f"Processing RTSTRUCT: {rtstruct_path}")
    
    try:
        rtstruct = pydicom.dcmread(rtstruct_path)
    except Exception as e:
        logging.error(f"Could not read RTSTRUCT {rtstruct_path}: {e}")
        return

    if 'ReferencedFrameOfReferenceSequence' not in rtstruct:
        logging.error("RTSTRUCT missing ReferencedFrameOfReferenceSequence")
        return

    # Extract Referenced Series UID
    reference_frame_ref = rtstruct.ReferencedFrameOfReferenceSequence[0]
    if 'RTReferencedStudySequence' in reference_frame_ref:
        study_seq = reference_frame_ref.RTReferencedStudySequence[0]
        if 'RTReferencedSeriesSequence' in study_seq:
            ref_series_uid = study_seq.RTReferencedSeriesSequence[0].SeriesInstanceUID
        elif 'ReferencedSeriesSequence' in study_seq:
            ref_series_uid = study_seq.ReferencedSeriesSequence[0].SeriesInstanceUID
        else:
            logging.error("No Referenced Series Sequence found in RT Referenced Study")
            return
    else:
        # Fallback? Some old RTSTRUCTs might differ, but this is standard.
        logging.error("No RTReferencedStudySequence found")
        return
    
    if not ref_series_uid:
        logging.error("Could not determine Referenced Series Instance UID from RTSTRUCT")
        return

    # Look for images in the same directory as RTSTRUCT
    input_dir = os.path.dirname(rtstruct_path)
    itk_image, source_datasets, loaded_series_uid = find_dicom_series_in_dir(input_dir, ref_series_uid)
    
    if itk_image is None:
        logging.error(f"Could not find Referenced Series {ref_series_uid} in {input_dir}")
        return
        
    # Get Image Geometry
    size = itk_image.GetSize() # (x, y, z)
    origin = itk_image.GetOrigin()
    spacing = itk_image.GetSpacing()
    direction = itk_image.GetDirection()
    
    logging.info(f"  Image Geometry:")
    logging.info(f"    Size: {size}")
    logging.info(f"    Origin: {origin}")
    logging.info(f"    Spacing: {spacing}")
    logging.info(f"    Direction: {direction}")
    
    width, height, depth = size
    # Create empty segmentation mask
    # Shape for numpy is (z, y, x) usually, depending on conventions.
    # SimpleITK GetArrayFromImage returns (z, y, x).
    # We will accumulate masks here.
    
    # Build Z-map from source datasets to handle coordinate mismatches robustly
    z_positions = []
    # Assumes source_datasets is sorted correctly (same as ITK volume)
    for ds in source_datasets:
        try:
            ipp = ds.ImagePositionPatient
            z = float(ipp[2])
            z_positions.append(z)
        except:
            z_positions.append(float('nan'))

    # Helper to find nearest slice
    def get_z_index(target_z, positions):
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
            # Check a few
            slice_spacing = abs(valid_zs[1] - valid_zs[0])
        else:
            slice_spacing = float(itk_image.GetSpacing()[2])
    except:
        slice_spacing = 2.0 
    
    tolerance = slice_spacing * 0.55 

    # Parse ROIs
    if 'ROIContourSequence' not in rtstruct:
        logging.warning("No ROIContourSequence in RTSTRUCT")
        return

    roi_map = {}
    if 'StructureSetROISequence' in rtstruct:
        for roi in rtstruct.StructureSetROISequence:
            roi_map[roi.ROINumber] = roi

    for roi_contour in rtstruct.ROIContourSequence:
        roi_number = roi_contour.ReferencedROINumber
        if roi_number not in roi_map:
            logging.warning(f"ROI Number {roi_number} not found in StructureSetROISequence")
            continue
            
        roi_name = roi_map[roi_number].ROIName
        logging.info(f"  Found ROI: {roi_name} (Number {roi_number})")
        
        if not hasattr(roi_contour, 'ContourSequence'):
            logging.info(f"  Skipping ROI {roi_name}: No ContourSequence")
            continue
            
        # Create mask for this ROI
        mask_array = np.zeros((depth, height, width), dtype=np.uint8)
        
        has_data = False
        
        for contour in roi_contour.ContourSequence:
            if not hasattr(contour, 'ContourData'):
                continue
                
            points_flat = contour.ContourData
            points = np.array(points_flat).reshape(-1, 3)
            
            # 1. Determine Z-index manually using the Z-map/Source Datasets
            contour_z = points[0][2] 
            
            z_idx, dist = get_z_index(contour_z, z_positions)
            
            if dist > tolerance:
                if LOG_DEBUG_COORDS:
                     logging.warning(f"    Skipping Contour: Z {contour_z} not matching any slice (nearest {z_positions[z_idx]} dist {dist:.2f})")
                continue
            
            # 2. Get X,Y indices using ITK
            indices = [itk_image.TransformPhysicalPointToContinuousIndex(p) for p in points]
            
            r_coords = [p[1] for p in indices]
            c_coords = [p[0] for p in indices]
            
            # Rasterize
            rr, cc = draw.polygon(r_coords, c_coords, shape=(height, width))
            mask_array[z_idx, rr, cc] = 1
            has_data = True

        if not has_data:
            # Maybe log why?
            logging.warning(f"  ROI {roi_name} resulted in empty mask. Skipping.")
            continue
            
        # Create SEG for this ROI
        logging.info(f"  Creating SEG for {roi_name}...")
        
        # Describe Segment
        
        segment_description = SegmentDescription(
            segment_number=1,
            segment_label=roi_name,
            segmented_property_category=codes.SCT.Organ,
            segmented_property_type=codes.SCT.Organ,
            algorithm_type=SegmentAlgorithmTypeValues.SEMIAUTOMATIC,
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
                series_number=100 + roi_number, # arbitrary
                sop_instance_uid=generate_uid(),
                instance_number=1,
                manufacturer="Custom RTSTRUCT Converter",
                manufacturer_model_name="RTSTRUCT2SEG",
                software_versions="0.1",
                device_serial_number="123456",
            )
            
            # Set Series Description to the structure name as requested
            seg_dataset.SeriesDescription = roi_name
            
            # Save
            safe_roi_name = "".join([c for c in roi_name if c.isalnum() or c in (' ', '_', '-')]).strip()
            out_filename = f"{safe_roi_name}.dcm"
            out_path = os.path.join(output_dir, out_filename)
            seg_dataset.save_as(out_path)
            logging.info(f"  Saved SEG to: {out_path}")
            
        except Exception as e:
            logging.error(f"  Failed to create SEG for {roi_name}: {e}\n{e}")

def main():
    parser = argparse.ArgumentParser(description="Convert RTSTRUCT to DICOM SEG")
    parser.add_argument("input_dir", nargs="?", default=os.getcwd(), help="Input directory to scan (default: current directory)")
    parser.add_argument("--recursive", action="store_true", default=True, help="Scan recursively")
    args = parser.parse_args()

    base_dir = args.input_dir
    if not os.path.exists(base_dir):
        logging.error(f"Directory not found: {base_dir}")
        return

    logging.info(f"Scanning directory: {base_dir}")
    
    # Recursive walk
    rtstruct_files = []
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            full_path = os.path.join(root, f)
            try:
                # fast check ext
                if not f.lower().endswith('.dcm'):
                    continue
                
                # Check SOP Class
                # defer full read
                # Just read meta header to speed up?
                # pydicom.dcmread(..., stop_before_pixels=True) is good.
                try:
                    ds = pydicom.dcmread(full_path, stop_before_pixels=True, force=True)
                    if 'SOPClassUID' in ds:
                        if ds.SOPClassUID == '1.2.840.10008.5.1.4.1.1.481.3': # RT Structure Set Storage
                            rtstruct_files.append(full_path)
                            logging.info(f"Found RTSTRUCT: {f}")
                except Exception as e:
                    pass
            except:
                pass
    
    if not rtstruct_files:
        logging.warning("No RTSTRUCT files found in scan paths.")
        # Fallback check for "Data to be converted" explicitly if user didn't specify
        target_sub = os.path.join(base_dir, "Data to be converted")
        if os.path.isdir(target_sub) and target_sub != base_dir:
             logging.info(f"Checking 'Data to be converted' specifically...")
             # (Logic would be repetitive, but main scan should have caught it if recursive=True)
        return

    logging.info(f"Found {len(rtstruct_files)} RTSTRUCT files to process.")
    
    for rts in rtstruct_files:
        out_dir = os.path.dirname(rts)
        process_rtstruct(rts, out_dir)

if __name__ == "__main__":
    main()
