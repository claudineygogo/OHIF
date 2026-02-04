import pydicom
import os

folder = r"C:\Users\Claudiney\Viewers\Scorer\RTSTRUCT samples"
files = [f for f in os.listdir(folder) if f.endswith(".dcm")]

print(f"Found files: {files}")

ds_list = []
for f in files:
    path = os.path.join(folder, f)
    ds = pydicom.dcmread(path, force=True)
    ds_list.append((f, ds, os.path.getsize(path)))

for name, ds, size in ds_list:
    print(f"\n--- {name} ({size/1024:.2f} KB) ---")
    print(f"SOPInstanceUID: {ds.SOPInstanceUID}")

    if "ROIContourSequence" in ds:
        print(f"ROIContourSequence: {len(ds.ROIContourSequence)} Items")
        total_contours = 0
        for roi in ds.ROIContourSequence:
            if "ContourSequence" in roi:
                total_contours += len(roi.ContourSequence)
        print(f"Total Contours (All ROIs): {total_contours}")
    else:
        print("ROIContourSequence: MISSING")

    if "StructureSetROISequence" in ds:
        print(f"StructureSetROISequence: {len(ds.StructureSetROISequence)} Items")
    else:
        print("StructureSetROISequence: MISSING")

    if "ReferencedFrameOfReferenceSequence" in ds:
        print("ReferencedFrameOfReferenceSequence: Present")
    else:
        print("ReferencedFrameOfReferenceSequence: MISSING")
