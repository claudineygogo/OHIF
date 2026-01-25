import numpy as np
import pickle
import struct

# Try to load the files and determine their format
files = ['User Seg (Brain)', 'Reference Seg (brain)']

for filename in files:
    print(f"\n{'='*60}")
    print(f"Inspecting: {filename}")
    print('='*60)
    
    # Read first few bytes to check format
    with open(filename, 'rb') as f:
        header = f.read(100)
        print(f"First 20 bytes (hex): {header[:20].hex()}")
        print(f"First 20 bytes (ascii): {header[:20]}")
    
    # Try loading as numpy .npy file
    try:
        data = np.load(filename)
        print(f"[SUCCESS] Loaded as NumPy .npy file")
        print(f"  Type: {type(data)}")
        print(f"  Shape: {data.shape}")
        print(f"  Dtype: {data.dtype}")
        print(f"  Min: {data.min()}, Max: {data.max()}")
        print(f"  Unique values: {np.unique(data)[:10]}")
        continue
    except Exception as e:
        print(f"[FAILED] NumPy .npy: {str(e)[:100]}")
    
    # Try loading as pickle
    try:
        with open(filename, 'rb') as f:
            data = pickle.load(f)
        print(f"[SUCCESS] Loaded as Pickle file")
        print(f"  Type: {type(data)}")
        if hasattr(data, 'shape'):
            print(f"  Shape: {data.shape}")
            print(f"  Dtype: {data.dtype}")
        continue
    except Exception as e:
        print(f"[FAILED] Pickle: {str(e)[:100]}")
    
    # Try loading as raw binary (assuming it might be raw array data)
    try:
        with open(filename, 'rb') as f:
            raw_data = f.read()
        print(f"[INFO] File size: {len(raw_data)} bytes")
        
        # Try to interpret as different data types
        for dtype in [np.uint8, np.uint16, np.float32, np.float64]:
            try:
                arr = np.frombuffer(raw_data, dtype=dtype)
                print(f"  As {dtype}: {len(arr)} elements, min={arr.min()}, max={arr.max()}")
            except:
                pass
    except Exception as e:
        print(f"[FAILED] Raw binary: {str(e)[:100]}")
