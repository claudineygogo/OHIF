import os
import shutil
import tempfile
import pydicom
import argparse
import numpy as np
from PIL import Image
import uuid
import sys
import tkinter as tk
from tkinter import filedialog, messagebox

# --- Optimization Logic (Embedded) ---

def generate_uid(prefix="1.2.826.0.1.3680043.2.1125."):
    """Generates a unique UID."""
    return prefix + str(uuid.uuid4().int)

def load_dicom_series(input_dir, log_func=print):
    """Loads DICOM files, separating Images and RTSTRUCT."""
    images = []
    structs = []

    if not os.path.exists(input_dir):
        log_func(f"Error: Input directory not found: {input_dir}")
        return [], []

    for f in os.listdir(input_dir):
        filepath = os.path.join(input_dir, f)
        if os.path.isfile(filepath):
            try:
                ds = pydicom.dcmread(filepath, stop_before_pixels=False)
                if ds.Modality == "RTSTRUCT":
                    structs.append(ds)
                elif hasattr(ds, "ImagePositionPatient"):
                    images.append((ds.ImagePositionPatient[2], ds))
            except:
                pass

    # Sort images by Z-position
    images.sort(key=lambda x: x[0])
    return [x[1] for x in images], structs

def update_rtstruct(rtstruct, uid_map, z_map, kept_uids, log_func=print):
    """Updates RTSTRUCT references based on UID mapping and handles decimation."""
    log_func(f"--- Updating RTSTRUCT: {rtstruct.SOPInstanceUID} ---")

    contours_kept = 0
    contours_remapped = 0
    contours_dropped = 0

    # 1. Update ReferencedFrameOfReferenceSequence
    if hasattr(rtstruct, "ReferencedFrameOfReferenceSequence"):
        for frame_ref in rtstruct.ReferencedFrameOfReferenceSequence:
            if hasattr(frame_ref, "RTReferencedStudySequence"):
                for study_ref in frame_ref.RTReferencedStudySequence:
                    if hasattr(study_ref, "RTReferencedSeriesSequence"):
                        for series_ref in study_ref.RTReferencedSeriesSequence:
                            # Filter ContourImageSequence
                            if hasattr(series_ref, "ContourImageSequence"):
                                new_contour_image_seq = []
                                for img_ref in series_ref.ContourImageSequence:
                                    old_uid = img_ref.ReferencedSOPInstanceUID
                                    if old_uid in uid_map:
                                        img_ref.ReferencedSOPInstanceUID = uid_map[old_uid]
                                        new_contour_image_seq.append(img_ref)
                                    # RTReferencedSeriesSequence usually lists ALL referenced images.
                                    # If an image was dropped, it should be removed from here.
                                    # We don't "remap" here, because this is just a list of "what images are used".
                                    # The Remapping happens in ROIContourSequence.
                                series_ref.ContourImageSequence = new_contour_image_seq

    # 2. Update ROIContourSequence
    if hasattr(rtstruct, "ROIContourSequence"):
        for roi_contour in rtstruct.ROIContourSequence:
            if hasattr(roi_contour, "ContourSequence"):
                new_contour_seq = []
                for contour in roi_contour.ContourSequence:
                    if hasattr(contour, "ContourImageSequence") and len(contour.ContourImageSequence) > 0:
                        img_ref = contour.ContourImageSequence[0]
                        old_uid = img_ref.ReferencedSOPInstanceUID

                        if old_uid in uid_map:
                            # Direct mapping
                            img_ref.ReferencedSOPInstanceUID = uid_map[old_uid]
                            new_contour_seq.append(contour)
                            contours_kept += 1
                        elif kept_uids:
                            # Decimated: Find nearest kept slice
                            # Get Old Z
                            if old_uid in z_map:
                                old_z = z_map[old_uid]
                                # Find nearest new slice
                                # Calculate distances to all kept slices (using original UIDs to lookup their Z)
                                # Actually, identifying which KEPT slice is nearest is easier if we look at z_map
                                # But we need the UID of that kept slice

                                best_dist = float('inf')
                                best_kept_uid = None

                                # Optimization: Iterate only kept UIDs
                                # This can be slow if O(N*M). M=contours, N=slices.
                                # Given N=120, M=2000, it's fine (240k ops).
                                for kept_old_uid in kept_uids:
                                    if kept_old_uid not in z_map: continue
                                    dist = abs(z_map[kept_old_uid] - old_z)
                                    if dist < best_dist:
                                        best_dist = dist
                                        best_kept_uid = kept_old_uid

                                if best_kept_uid and best_dist < 5.0: # Threshold 5mm to avoid crazy jumps
                                    # Map to this nearest neighbor
                                    # Note: This might stack contours on the same slice.
                                    img_ref.ReferencedSOPInstanceUID = uid_map[best_kept_uid]
                                    new_contour_seq.append(contour)
                                    contours_remapped += 1
                                else:
                                    # Can't find Z, drop it
                                    contours_dropped += 1
                            else:
                                # Can't find Z, drop it
                                contours_dropped += 1
                        else:
                             contours_dropped += 1

                roi_contour.ContourSequence = new_contour_seq

    log_func(f"  Contours Kept: {contours_kept}")
    log_func(f"  Contours Remapped: {contours_remapped}")
    log_func(f"  Contours Dropped: {contours_dropped}")

    # 3. Assign new SOPInstanceUID
    rtstruct.SOPInstanceUID = generate_uid()
    rtstruct.file_meta.MediaStorageSOPInstanceUID = rtstruct.SOPInstanceUID
    return rtstruct

def save_refined_datasets(images, structs, output_dir, prefix="", log_func=print):
    """Saves images and RTSTRUCTs."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    def safe_fix_meta(ds):
        if hasattr(ds, "fix_meta_info"):
            try:
                ds.fix_meta_info()
            except:
                pass # Fallback if it exists but fails

        # Manual enforcement for critical Orthanc tags
        if not hasattr(ds, "file_meta"):
            from pydicom.dataset import FileMetaDataset
            ds.file_meta = FileMetaDataset()

        ds.file_meta.MediaStorageSOPInstanceUID = ds.SOPInstanceUID
        ds.file_meta.MediaStorageSOPClassUID = ds.SOPClassUID

    # Save Images
    for i, ds in enumerate(images):
        filename = f"IMG-{i+1:04d}.dcm"
        safe_fix_meta(ds)
        ds.save_as(os.path.join(output_dir, filename))

    # Save RTSTRUCTs
    for i, ds in enumerate(structs):
        if hasattr(ds, "SeriesDescription"):
             ds.SeriesDescription = f"{prefix} {ds.SeriesDescription}"
        filename = f"RT-{i+1:04d}.dcm"
        safe_fix_meta(ds)
        ds.save_as(os.path.join(output_dir, filename))

    log_func(f"Saved {len(images)} images and {len(structs)} structs to {output_dir}")


def process_pipeline(images, structs, do_decimate, do_8bit, do_resize, log_func):
    """Executes the optimization pipeline with UID tracking."""

    # 1. Map Initial UIDs and Z-Coords
    uid_map = {} # Old -> New (Final) - Updated at the end
    z_map = {} # Old -> Z

    # To track UIDs across steps, we assign "current" UIDs.
    # Actually, we rely on the object reference `ds` staying the same, but pydicom copies?
    # No, python passes by reference.
    # But wait! Decimation DROPS objects.
    # 8-bit REPLACES PixelData (same object).
    # Resize REPLACES PixelData (same object).

    # Strategy:
    # 1. Store Original UIDs and Zs from the raw load.
    raw_images_map = {ds.SOPInstanceUID: ds for ds in images}
    for ds in images:
        z_map[ds.SOPInstanceUID] = float(ds.ImagePositionPatient[2])

    processed_images = images

    # 2. Decimation
    if do_decimate:
        log_func("Applying Decimation...")
        processed_images = processed_images[::2] # Keep every 2nd

        # Adjust spacing
        for ds in processed_images:
            if hasattr(ds, "SpacingBetweenSlices"):
                ds.SpacingBetweenSlices = float(ds.SpacingBetweenSlices) * 2
            if hasattr(ds, "SliceThickness"):
                ds.SliceThickness = float(ds.SliceThickness) * 2

        # Update Instance Numbers
        for i, ds in enumerate(processed_images):
            ds.InstanceNumber = i + 1

        log_func(f"-> {len(processed_images)} images remaining.")

    # 3. 8-Bit
    if do_8bit:
        log_func("Applying 8-bit Quantization...")
        for ds in processed_images:
            if hasattr(ds, "PixelData"):
                orig = ds.pixel_array.astype(np.float32)
                slope = getattr(ds, 'RescaleSlope', 1)
                intercept = getattr(ds, 'RescaleIntercept', 0)
                hu = orig * slope + intercept

                # Window 400/40
                hu = np.clip(hu, 40-200, 40+200)
                hu = ((hu - (40-200)) / 400.0) * 255.0
                uint8 = hu.astype(np.uint8)

                ds.PixelData = uint8.tobytes()
                ds.Rows, ds.Columns = uint8.shape
                ds.BitsAllocated = 8
                ds.BitsStored = 8
                ds.HighBit = 7
                ds.SamplesPerPixel = 1
                ds.PixelRepresentation = 0

                # Cleaning tags
                for tag in ["RescaleSlope", "RescaleIntercept", "WindowCenter", "WindowWidth"]:
                    if tag in ds: delattr(ds, tag)

    # 4. Resize
    if do_resize:
        log_func("Applying Resizing (256x256)...")
        target_size = (256, 256)
        for ds in processed_images:
             if hasattr(ds, "PixelData"):
                orig = ds.pixel_array

                # Check 8-bit vs 16-bit for PIL
                if ds.BitsAllocated == 8:
                     img = Image.fromarray(orig, mode='L')
                else:
                     img = Image.fromarray(orig.astype(np.float32)) # F mode fallback

                resized = img.resize(target_size, Image.BILINEAR)
                arr = np.array(resized)

                if ds.BitsAllocated == 8:
                     arr = arr.astype(np.uint8)
                else:
                     arr = arr.astype(ds.pixel_array.dtype)

                ds.PixelData = arr.tobytes()

                # Spacing Update
                r_factor = ds.Rows / 256.0
                c_factor = ds.Columns / 256.0
                ds.Rows, ds.Columns = 256, 256

                if hasattr(ds, "PixelSpacing"):
                    ds.PixelSpacing = [ds.PixelSpacing[0]*r_factor, ds.PixelSpacing[1]*c_factor]
                if hasattr(ds, "ImagerPixelSpacing"):
                    ds.ImagerPixelSpacing = [ds.ImagerPixelSpacing[0]*r_factor, ds.ImagerPixelSpacing[1]*c_factor]

    # 5. Finalize UIDs
    log_func("Generating new UIDs...")

    kept_original_uids = [] # List of Original UIDs that survived

    # We iterate PROCESSED images. But wait, we need to know their ORIGINAL UID to build the map.
    # Since we modified the objects in place, `ds.SOPInstanceUID` is STILL the original UID right now.
    # We haven't changed it yet. Perfect.

    for ds in processed_images:
        old_uid = ds.SOPInstanceUID
        new_uid = generate_uid()

        kept_original_uids.append(old_uid)
        uid_map[old_uid] = new_uid

        # Apply New UID
        ds.SOPInstanceUID = new_uid
        ds.file_meta.MediaStorageSOPInstanceUID = new_uid

    # 6. Update RTSTRUCTS
    log_func("Updating RTSTRUCTs...")
    for rt in structs:
        update_rtstruct(rt, uid_map, z_map, set(kept_original_uids), log_func=log_func)

    return processed_images, structs

# --- GUI Logic ---

class OptimizerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Integrated DICOM & RTSTRUCT Optimizer")

        # Variables
        self.input_dir = tk.StringVar(value=os.path.join(os.getcwd(), "Data to be converted"))
        self.do_decimate = tk.BooleanVar(value=False)
        self.do_8bit = tk.BooleanVar(value=True)
        self.do_resize = tk.BooleanVar(value=False)
        self.dont_overwrite = tk.BooleanVar(value=False)

        # Layout
        tk.Label(root, text="Select Input Folder:").pack(pady=5)

        frame_input = tk.Frame(root)
        frame_input.pack(pady=5, padx=10, fill=tk.X)
        tk.Entry(frame_input, textvariable=self.input_dir, width=50).pack(side=tk.LEFT, fill=tk.X, expand=True)
        tk.Button(frame_input, text="Browse", command=self.browse_input).pack(side=tk.LEFT, padx=5)

        tk.Label(root, text="Select Optimizations:").pack(pady=10)
        tk.Checkbutton(root, text="Decimation (Keep 50%, Remap Contours)", variable=self.do_decimate).pack(anchor=tk.W, padx=20)
        tk.Checkbutton(root, text="8-Bit Quantization (Window 400/40)", variable=self.do_8bit).pack(anchor=tk.W, padx=20)
        tk.Checkbutton(root, text="Spatial Resize (to 256x256)", variable=self.do_resize).pack(anchor=tk.W, padx=20)
        tk.Checkbutton(root, text="Don't overwrite original files (Move to 'original dicom')", variable=self.dont_overwrite).pack(anchor=tk.W, padx=20)

        tk.Button(root, text="RUN OPTIMIZATION", command=self.run_optimization, bg="green", fg="white", font=("Arial", 12, "bold")).pack(pady=20)

        self.log_text = tk.Text(root, height=15, width=70)
        self.log_text.pack(pady=10, padx=10)

    def browse_input(self):
        folder = filedialog.askdirectory(initialdir=self.input_dir.get())
        if folder:
            self.input_dir.set(folder)

    def log(self, message):
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.root.update()

    def run_optimization(self):
        input_path = self.input_dir.get()
        if not os.path.isdir(input_path):
            messagebox.showerror("Error", "Input directory does not exist.")
            return

        # Determine output folder name (for logging/metadata only now)
        techniques = []
        if self.do_decimate.get(): techniques.append("Decimated")
        if self.do_8bit.get(): techniques.append("8Bit")
        if self.do_resize.get(): techniques.append("Resized")

        if not techniques:
            messagebox.showwarning("Warning", "No optimization selected.")
            return

        suffix = "_".join(techniques)

        self.log("Starting Optimization...")
        self.log(f"Input: {input_path}")
        self.log(f"Overwrite Original: {not self.dont_overwrite.get()}")

        try:
            images, structs = load_dicom_series(input_path, self.log)
            if not images:
                self.log("No DICOM images found.")
                return

            self.log(f"Loaded {len(images)} images and {len(structs)} RTSTRUCTs.")

            images, structs = process_pipeline(images, structs,
                                             self.do_decimate.get(),
                                             self.do_8bit.get(),
                                             self.do_resize.get(),
                                             self.log)

            self.log("Saving files...")

            # Use a temporary directory to save new files first
            with tempfile.TemporaryDirectory() as temp_dir:
                save_refined_datasets(images, structs, temp_dir, prefix=f"[{suffix}]", log_func=self.log)

                # Logic for Originals
                if self.dont_overwrite.get():
                    original_dicom_dir = os.path.join(os.path.dirname(input_path), "original dicom")
                    if not os.path.exists(original_dicom_dir):
                        os.makedirs(original_dicom_dir)

                    self.log(f"Moving original files to: {original_dicom_dir}")
                    for f in os.listdir(input_path):
                        src = os.path.join(input_path, f)
                        if os.path.isfile(src):
                            dst = os.path.join(original_dicom_dir, f)
                            shutil.move(src, dst)
                else:
                    self.log("Cleaning up original files (Overwrite mode)...")
                    for f in os.listdir(input_path):
                        src = os.path.join(input_path, f)
                        if os.path.isfile(src):
                            os.remove(src)

                # Move extracted files from temp to input
                self.log(f"Updating files in {input_path}...")
                for f in os.listdir(temp_dir):
                    shutil.move(os.path.join(temp_dir, f), os.path.join(input_path, f))

            self.log("DONE! The files have been processed and updated.")
            messagebox.showinfo("Success", f"Optimization Complete!\nFolder updated: {input_path}")

        except Exception as e:
            self.log(f"ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            messagebox.showerror("Error", str(e))

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("GUI Tool loaded successfully in CLI test mode.")
        return

    root = tk.Tk()
    app = OptimizerApp(root)
    root.mainloop()
    print("Closing application...")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Critical Error: {e}")
    finally:
        if len(sys.argv) == 1:
            input("Press Enter to exit...")
