import os
import argparse
import sys
# Import functions from the sibling script
from dicom_optimizer import load_dicom_series, save_dicom_series, apply_decimation, apply_8bit_quantization, apply_resizing

def main():
    parser = argparse.ArgumentParser(description="DICOM Ultra-Light Optimizer (Decimate + 8-bit + Resize)")
    parser.add_argument("--input", required=True, help="Input directory")
    parser.add_argument("--output", required=True, help="Output directory")

    args = parser.parse_args()

    print(f"Loading data from {args.input}...")
    datasets = load_dicom_series(args.input)
    print(f"Loaded {len(datasets)} slices.")

    # 1. Decimate
    print("Step 1/3: Decimating...")
    datasets = apply_decimation(datasets)
    print(f"-> {len(datasets)} slices remaining.")

    # 2. 8-bit Quantization
    print("Step 2/3: Converting to 8-bit (Window: 400/40)...")
    datasets = apply_8bit_quantization(datasets)

    # 3. Resize
    print("Step 3/3: Resizing to 256x256...")
    datasets = apply_resizing(datasets, size=(256, 256))

    print(f"Saving to {args.output}...")
    save_dicom_series(datasets, args.output, prefix="[ULTRA-LIGHT]")
    print("Done.")

if __name__ == "__main__":
    main()
