import os
import shutil
import zipfile
import subprocess
import sys
from pathlib import Path

# Configuration
TEST_CASE = "lung-nodule-1"
TEST_URL = "https://ohif.sinapsos.com/case/lung101"
TEMPLATE_DIR = "scorm-template"
OUTPUT_DIR = "test-packages"
GENERATOR_SCRIPT = "package-generator.py"

def assert_true(condition, message):
    if not condition:
        print(f"FAIL: {message}")
        sys.exit(1)
    print(f"PASS: {message}")

def main():
    print("=== Starting Package Generator End-to-End Test ===")

    # 1. Clean previous run
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
        print(f"Cleaned up previous {OUTPUT_DIR}")

    # 2. Run the generator command
    cmd = [
        sys.executable, GENERATOR_SCRIPT,
        "--template", TEMPLATE_DIR,
        "--case", TEST_CASE,
        "--url", TEST_URL,
        "--output", OUTPUT_DIR
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("Generator failed execution!")
        print("STDERR:", result.stderr)
        print("STDOUT:", result.stdout)
        sys.exit(1)
    else:
        print("Generator execution successful.")

    # 3. Assertions

    # Assert 1: Output directory created
    assert_true(os.path.exists(OUTPUT_DIR), "Output directory created")

    # Assert 2: Zip file exists
    zip_path = os.path.join(OUTPUT_DIR, f"{TEST_CASE}.zip")
    assert_true(os.path.exists(zip_path), f"Zip file {zip_path} exists")

    # Inspect Zip contents
    extract_dir = os.path.join(OUTPUT_DIR, "extracted_verification")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
    
    # Assert 3: Cleanup (Temp dir gone) - Implicitly checked by checking what's in OUTPUT_DIR
    # We expect only the zip and our extraction folder, no 'temp_lung-nodule-1'
    temp_residue = os.path.join(OUTPUT_DIR, f"temp_{TEST_CASE}")
    assert_true(not os.path.exists(temp_residue), "Temporary directory was cleaned up")

    # Assert 4: content verification
    index_path = os.path.join(extract_dir, "index.html")
    with open(index_path, 'r', encoding='utf-8') as f:
        index_content = f.read()

    assert_true(TEST_URL in index_content, f"index.html contains injected URL: {TEST_URL}")
    assert_true("{{CASE_URL}}" not in index_content, "index.html does not contain placeholder {{CASE_URL}}")

    manifest_path = os.path.join(extract_dir, "imsmanifest.xml")
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest_content = f.read()
    
    expected_title = "Medical Segmentation - Lung Nodule 1"
    assert_true(expected_title in manifest_content, f"imsmanifest.xml contains title: {expected_title}")

    print("\n=== ALL TESTS PASSED ===")
    
    # Cleanup verification extraction
    if os.path.exists(extract_dir):
        shutil.rmtree(extract_dir)

if __name__ == "__main__":
    main()
