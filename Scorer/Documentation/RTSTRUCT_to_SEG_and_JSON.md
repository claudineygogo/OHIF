# RTSTRUCT to SEG and JSON Converter

## Overview
The `RTSTRUCT_to_SEG_and_JSON.py` script is a utility designed to convert legacy DICOM RTSTRUCT (contour-based) data into modern DICOM SEG (pixel-based) objects. Additionally, it generates a "Reference JSON" file for use with the Scorer application. This JSON file contains a sparse representation (indices) of the segmentation, which the Scorer uses as the "Ground Truth" for grading user submissions.

## How It Works

### 1. Discovery
- The script looks for DICOM files in the specified input directory.
- It identifies the CT Series (images) and the RTSTRUCT file.
- It builds a "Geometry Map" of the CT volume, mapping every Z-coordinate (slice position) to a slice index (0 to N).

### 2. RTSTRUCT Processing
- It reads the RTSTRUCT file and iterates through every ROI (Region of Interest) defined in it.
- For each ROI, it "rasterizes" the contour data onto the matching CT slices, creating a binary mask (0s and 1s).
- It generates a valid **DICOM SEG** file for each ROI using the `highdicom` library.
- These SEG files are saved in the input directory.

### 3. JSON Generation (for Scoring)
- After creating the SEGs, the script reads them back to verify alignment.
- It extracts the indices of all "non-zero" pixels (pixels representing the organ/structure).
- It maps these 1D indices, along with their Slice Indices, into a compressed JSON format.
- The JSON file is saved to the `References` folder.

## Usage

**Command Line:**
```bash
python RTSTRUCT_to_SEG_and_JSON.py [INPUT_DIRECTORY]
```

**Folder Selection:**
If no input directory is provided via the command line, the script will open a **folder selection dialog**.
- The dialog opens by default to `Data to be converted` (if it exists).
- The user can navigate to and select any folder containing the DICOM files.

## Data Involved

- **Input**: A folder containing a DICOM CT Series (multiple .dcm files) and one RTSTRUCT file.
- **Output**:
    - **DICOM SEG Files**: Generated `.dcm` files (e.g., `Heart.dcm`) saved in the *input folder*.
    - **Reference JSON**: A `.json` file (e.g., `Heart.json`) saved in the `References/{PatientID}/` folder.

## Key Logic
- **Tolerance Matching**: The script uses a fuzzy matching logic (tolerance of ~1/2 slice thickness) to snap RTSTRUCT contours to the nearest CT slice, ensuring data lines up correctly even if coordinates are floating-point slightly off.
- **Sparse Storage**: To keep the Scoring reference files small, it stores only the linear indices of the positive voxels rather than the full 3D array.
