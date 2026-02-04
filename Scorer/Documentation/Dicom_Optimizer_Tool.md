# DICOM Optimizer Tool

## Overview
The `dicom_optimizer_tool.py` is an "All-in-One" utility for preparing DICOM data for web deployment. Medical imaging data is often too large (high resolution, 16-bit depth, thousands of slices) for smooth web performance. This tool reduces file size and complexity while preserving the integrity of the clinical data and annotations (RTSTRUCTs).

## How It Works

The tool launches a Graphical User Interface (GUI) that allows the user to select an input folder and apply one or more optimization strategies:

### 1. Decimation (50% Reduction)
- **What it does**: Removes every second slice from the volume (e.g., reduces 300 slices to 150).
- **Smart Remapping**: Crucially, it **remaps RTSTRUCT contours**. If a contour was drawn on a slice that gets deleted, the tool moves that contour to the nearest specific *kept* slice. This prevents the loss of segmentation data.

### 2. 8-Bit Quantization
- **What it does**: Converts the high-fidelity 16-bit pixel data (HU units) into standard 8-bit integers (0-255).
- **Logic**: It applies a specific "Window" (Level: 40, Width: 400), which is ideal for viewing soft tissue and lungs. Values outside this range are clipped. This significantly reduces file size.

### 3. Spatial Resizing
- **What it does**: Downscales each image frame to 256x256 pixels.
- **Logic**: Uses bilinear interpolation to smooth the image. It automatically updates the `PixelSpacing` DICOM tags so that measurements remain accurate despite the resolution change.

## Usage

**Running the Tool:**
```bash
python dicom_optimizer_tool.py
```
*(This opens the GUI window)*

### Steps:
1. Click **Browse** to select the folder containing your DICOM Series.
2. Check the boxes for the optimizations you want (typically all three are checked for web-scorm use).
3. Click **RUN OPTIMIZATION**.

## Data Involved

- **Input**: A folder containing DICOM images and (optionally) an RTSTRUCT file.
- **Output**: A new folder is created next to the input folder, named with the applied techniques (e.g., `Optimized_Decimated_8Bit_Resized`).
- **Anonymization**: The tool assumes that if you are optimizing, you are creating a new instance. It generates **NEW UIDs** for all Series, Study, and SOP Instances to ensure they don't conflict with the original data in a PACS.
