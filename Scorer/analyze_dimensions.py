import numpy as np

# Analyze file sizes to determine possible dimensions
files = {
    'User Seg (Brain)': 1469590,
    'Reference Seg (brain)': 1302940
}

for name, size in files.items():
    print(f"\n{name}: {size} bytes")
    
    # Try to find cube root (for cubic volumes)
    cube_root = size ** (1/3)
    print(f"  Cube root: {cube_root:.2f}")
    
    # Try common medical imaging dimensions
    # Common dimensions: 256x256x?, 512x512x?, etc.
    for dim in [256, 512, 128, 64]:
        if size % (dim * dim) == 0:
            z = size // (dim * dim)
            print(f"  Possible: {dim} x {dim} x {z}")
    
    # Try to factorize
    print(f"  Trying factorization...")
    for x in [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]:
        for y in [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]:
            if size % (x * y) == 0:
                z = size // (x * y)
                if 50 < z < 300:
                    print(f"    {x} x {y} x {z} = {x*y*z}")
