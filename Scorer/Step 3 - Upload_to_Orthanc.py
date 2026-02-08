import os
import requests
import tkinter as tk
from tkinter import filedialog
import concurrent.futures
import threading
import time

# Configuration
ORTHANC_URL = "http://localhost:8042/instances"
INITIAL_DIR = r"C:\Users\Claudiney\Viewers\Scorer\Data to be converted"
MAX_WORKERS = 20  # Number of parallel uploads

# Global variables for progress tracking
success_count = 0
error_count = 0
processed_count = 0
total_files = 0
print_lock = threading.Lock()

def upload_single_file(session, file_path):
    global success_count, error_count, processed_count

    filename = os.path.basename(file_path)
    status = "UNKNOWN"

    try:
        with open(file_path, "rb") as f:
            dicom_data = f.read()

        # Orthanc expects raw binary data
        response = session.post(
            ORTHANC_URL,
            data=dicom_data,
            headers={'Content-Type': 'application/dicom'}
        )

        if response.status_code == 200:
            status = "OK"
            with print_lock:
                success_count += 1
        elif response.status_code == 400:
             # Common for non-DICOM files
             status = "SKIP (Not DICOM?)"
             with print_lock:
                 error_count += 1
        else:
            status = f"FAIL ({response.status_code})"
            with print_lock:
                error_count += 1

    except Exception as e:
        status = "ERR"
        with print_lock:
            error_count += 1

    with print_lock:
        processed_count += 1
        # Update progress on the same line to reduce console clutter
        print(f"\rProgress: {processed_count}/{total_files} | Success: {success_count} | Failed: {error_count} | Current: {filename}", end="", flush=True)

def upload_to_orthanc_parallel():
    global total_files

    # Initialize tkinter root and hide it
    root = tk.Tk()
    root.withdraw()

    print("Please select the folder containing DICOM files...")
    start_dir = INITIAL_DIR if os.path.exists(INITIAL_DIR) else os.getcwd()

    folder_path = filedialog.askdirectory(
        initialdir=start_dir,
        title="Select Folder for Bulk Upload"
    )

    if not folder_path:
        print("No folder selected. Exiting.")
        return

    # Collect files
    print("Scanning folder...", end=" ")
    files_to_upload = []
    for root_dir, _, files in os.walk(folder_path):
        for file in files:
            files_to_upload.append(os.path.join(root_dir, file))

    total_files = len(files_to_upload)
    print(f"Found {total_files} files.")

    if total_files == 0:
        input("Press Enter to exit...")
        return

    print(f"Starting parallel upload (Threads: {MAX_WORKERS})...")
    print("-" * 60)

    start_time = time.time()

    # Use a Session for connection pooling (faster)
    with requests.Session() as session:
        # We can pass the session to threads, requests.Session is thread-safe
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Create a tuple for each file to pass arguments to the function
            futures = [executor.submit(upload_single_file, session, f) for f in files_to_upload]

            # Wait for all to complete
            concurrent.futures.wait(futures)

    duration = time.time() - start_time

    print("\n" + "-" * 60)
    print(f"Done in {duration:.2f} seconds.")
    print(f"Successful: {success_count}")
    print(f"Failed/Skipped: {error_count}")
    input("Press Enter to close...")

if __name__ == "__main__":
    upload_to_orthanc_parallel()
