import numpy as np
import pydicom
import os


def reconstruct_mask(indices, origin_slice_index, target_shape=(295, 512, 512)):
    """Reconstruct a full 3D mask from compressed non-zero indices.
    
    Args:
        indices (list): Flat list of 1D indices where mask value is 1
        origin_slice_index (int): Starting slice index in the full volume
        target_shape (tuple): Shape of the full 3D volume (depth, height, width)
    
    Returns:
        numpy.ndarray: Full 3D binary mask array with shape target_shape
    """
    print(f"[DEBUG RECONSTRUCT] Reconstructing mask with {len(indices)} non-zero indices")
    print(f"[DEBUG RECONSTRUCT] Origin slice index: {origin_slice_index}")
    print(f"[DEBUG RECONSTRUCT] Target shape: {target_shape}")
    
    # Create empty 3D volume
    full_volume = np.zeros(target_shape, dtype=np.uint8)
    
    if len(indices) == 0:
        print("[DEBUG RECONSTRUCT] WARNING: No indices provided, returning empty mask")
        return full_volume
    
    # Convert flat indices to 3D coordinates
    # The indices are relative to a sub-volume starting at origin_slice_index
    # We need to calculate the sub-volume shape first
    depth, height, width = target_shape
    
    # Convert 1D indices to 3D coordinates
    indices_array = np.array(indices, dtype=np.int64)
    
    # Unravel indices assuming they're from a volume starting at origin_slice_index
    # The indices are in C-order (row-major) for the full volume
    z_coords = indices_array // (height * width)
    remainder = indices_array % (height * width)
    y_coords = remainder // width
    x_coords = remainder % width
    
    print(f"[DEBUG RECONSTRUCT] Index range - Z: [{z_coords.min()}, {z_coords.max()}]")
    print(f"[DEBUG RECONSTRUCT] Index range - Y: [{y_coords.min()}, {y_coords.max()}]")
    print(f"[DEBUG RECONSTRUCT] Index range - X: [{x_coords.min()}, {x_coords.max()}]")
    
    # Validate coordinates are within bounds
    valid_mask = (z_coords >= 0) & (z_coords < depth) & \
                 (y_coords >= 0) & (y_coords < height) & \
                 (x_coords >= 0) & (x_coords < width)
    
    if not np.all(valid_mask):
        invalid_count = np.sum(~valid_mask)
        print(f"[DEBUG RECONSTRUCT] WARNING: {invalid_count} indices out of bounds, skipping them")
        z_coords = z_coords[valid_mask]
        y_coords = y_coords[valid_mask]
        x_coords = x_coords[valid_mask]
    
    # Set the voxels to 1
    full_volume[z_coords, y_coords, x_coords] = 1
    
    print(f"[DEBUG RECONSTRUCT] Reconstructed mask has {np.sum(full_volume)} non-zero voxels")
    
    return full_volume


def load_segmentation_mask(filepath):
    """Load a DICOM Segmentation object and extract the 3D mask array.

    Args:
        filepath (str): Path to the DICOM segmentation file

    Returns:
        numpy.ndarray: 3D binary mask array

    Raises:
        FileNotFoundError: If file doesn't exist
        ValueError: If file is not a valid DICOM segmentation
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")
    try:
        dcm = pydicom.dcmread(filepath)
        if dcm.Modality != 'SEG':
            raise ValueError(f"File is not a DICOM Segmentation (Modality: {dcm.Modality})")
        mask = dcm.pixel_array
        mask = (mask > 0).astype(np.uint8)
        return mask
    except Exception as e:
        raise ValueError(f"Failed to load DICOM segmentation from {filepath}: {e}")


def dice_score(mask1, mask2, user_origin_index=None):
    """Calculate Dice Similarity Coefficient (DSC) between two 3D masks.

    Args:
        mask1: Reference mask (numpy array or file path)
        mask2: User mask (numpy array or file path)
        user_origin_index (int, optional): Deprecated, kept for backward compatibility.
                                           Masks should already be reconstructed to full volume.
    """
    # Load from file if needed (for backward compatibility)
    if isinstance(mask1, str):
        mask1 = load_segmentation_mask(mask1)
    if isinstance(mask2, str):
        mask2 = load_segmentation_mask(mask2)

    mask1 = np.asarray(mask1, dtype=bool)
    mask2 = np.asarray(mask2, dtype=bool)

    print(f"[DEBUG SCORER] Mask1 (Ref) shape: {mask1.shape}")
    print(f"[DEBUG SCORER] Mask2 (User) shape: {mask2.shape}")
    print(f"[DEBUG SCORER] Non-zero voxels in Ref: {np.sum(mask1)}")
    print(f"[DEBUG SCORER] Non-zero voxels in User: {np.sum(mask2)}")

    # Ensure masks have the same shape
    if mask1.shape != mask2.shape:
        print(f"[DEBUG SCORER] ERROR: Mask shapes don't match! Ref: {mask1.shape}, User: {mask2.shape}")
        raise ValueError(f"Mask shapes must match. Got {mask1.shape} and {mask2.shape}")

    # Calculate Dice
    intersection = np.logical_and(mask1, mask2)
    volume_intersection = np.sum(intersection)
    volume_mask1 = np.sum(mask1)
    volume_mask2 = np.sum(mask2)

    print(f"[DEBUG SCORER] Intersection voxels: {volume_intersection}")

    if volume_mask1 + volume_mask2 == 0:
        print("[DEBUG SCORER] Both masks are empty, returning 1.0")
        return 1.0

    dice = (2.0 * volume_intersection) / (volume_mask1 + volume_mask2)
    print(f"[DEBUG SCORER] Calculated Dice Score: {dice}")
    return float(dice)

