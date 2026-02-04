import os
import pydicom
import glob

def get_dicom_metadata(directory):
    files = [f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f)) and not f.endswith('.py') and not f.endswith('.json')]
    if not files:
        return None

    # Analyze the first file for shared metadata
    first_file = os.path.join(directory, files[0])
    try:
        ds = pydicom.dcmread(first_file, force=True)
    except Exception as e:
        print(f"Error reading {first_file}: {e}")
        return None

    rows = ds.get(0x00280010).value if ds.get(0x00280010) else 0
    cols = ds.get(0x00280011).value if ds.get(0x00280011) else 0
    bits_allocated = ds.get(0x00280100).value if ds.get(0x00280100) else 16
    pixel_spacing = ds.get(0x00280030).value if ds.get(0x00280030) else "N/A"
    modality = ds.get(0x00080060).value if ds.get(0x00080060) else "Unknown"

    # Count slices (files)
    num_slices = len(files)

    # Calculate VRAM (Bytes) -> MB
    # WebGL texture estimation: Width * Height * Slices * BytesPerPixel (Bits/8)
    # Browsers might expand to RGBA (4 bytes) depending on implementation, but raw volume is usually scalar.
    # We will estimate raw buffer size.
    raw_size_bytes = rows * cols * num_slices * (bits_allocated / 8)
    vram_mb = raw_size_bytes / (1024 * 1024)

    return {
        "Dataset": os.path.basename(directory),
        "Modality": modality,
        "Matrix": f"{rows}x{cols}",
        "Slices": num_slices,
        "BitDepth": bits_allocated,
        "Est_VRAM_MB": round(vram_mb, 2)
    }

base_path = r"C:\Users\Claudiney\Viewers\Scorer\Sample Data"
datasets = [
    "Head and Neck - bad",
    "Head and Neck - optimized",
    "Head and Neck - UltraLight",
    "SBRT Spine - good",
    "T2 MR - good"
]

results = []
for ds_name in datasets:
    full_path = os.path.join(base_path, ds_name)
    if os.path.exists(full_path):
        meta = get_dicom_metadata(full_path)
        if meta:
            results.append(meta)
    else:
        print(f"Directory not found: {full_path}")

# Print Table
print(f"{'Dataset':<25} | {'Modality':<10} | {'Matrix':<10} | {'Slices':<8} | {'Bits':<6} | {'VRAM (MB)':<10}")
print("-" * 85)
for r in results:
    print(f"{r['Dataset']:<25} | {r['Modality']:<10} | {r['Matrix']:<10} | {r['Slices']:<8} | {r['BitDepth']:<6} | {r['Est_VRAM_MB']:<10}")
