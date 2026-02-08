import os
import shutil
import zipfile
import re
from pathlib import Path
import tkinter as tk
from tkinter import messagebox
import sys

class ScormPackageGenerator:
    def __init__(self, template_dir, output_dir):
        self.template_dir = Path(template_dir).absolute()
        self.output_dir = Path(output_dir).absolute()
        self.required_files = [
            'imsmanifest.xml',
            'index.html',
            'css/styles.css',
            'js/scorm-handler.js',
            'js/message-bridge.js'
        ]

    def ensure_template_structure(self):
        """Verifies that all required files exist in the template directory."""
        missing_files = []
        for rel_path in self.required_files:
            file_path = self.template_dir / rel_path
            if not file_path.exists():
                missing_files.append(rel_path)

        if missing_files:
            raise FileNotFoundError(f"Missing required template files in {self.template_dir}: {', '.join(missing_files)}")

    def update_placeholders(self, package_dir, ohif_url, patient_id, structure_name):
        """Replaces placeholders in index.html and js/message-bridge.js."""

        # 1. Update index.html
        index_path = package_dir / 'index.html'
        if index_path.exists():
            content = index_path.read_text(encoding='utf-8')
            updated_content = content.replace('{{CASE_URL}}', ohif_url)
            index_path.write_text(updated_content, encoding='utf-8')

        # 2. Update js/message-bridge.js
        bridge_path = package_dir / 'js' / 'message-bridge.js'
        if bridge_path.exists():
            content = bridge_path.read_text(encoding='utf-8')
            updated_content = content.replace('{{CASE_URL}}', ohif_url)
            updated_content = updated_content.replace('{{PATIENT_ID}}', patient_id)
            updated_content = updated_content.replace('{{STRUCTURE_NAME}}', structure_name)
            bridge_path.write_text(updated_content, encoding='utf-8')

    def update_manifest(self, package_dir, case_name):
        """Updates the SCORM title in imsmanifest.xml."""
        manifest_path = package_dir / 'imsmanifest.xml'
        content = manifest_path.read_text(encoding='utf-8')

        # Use case_name directly to preserve user formatting (e.g. SBRT_Spine)
        full_title = f"Medical Segmentation - {case_name}"

        new_content = re.sub(r'<title>.*?</title>', f'<title>{full_title}</title>', content)

        manifest_path.write_text(new_content, encoding='utf-8')

    def create_zip_file(self, package_dir, case_name):
        """Zips the package directory content."""
        zip_filename = f"{case_name}.zip"
        zip_path = self.output_dir / zip_filename

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(package_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(package_dir)
                    zipf.write(file_path, arcname)

        return zip_path

    def create_package(self, case_name, ohif_url, patient_id, structure_name):
        """Orchestrates the package creation process."""
        self.ensure_template_structure()

        # ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Create temporary working directory for this package inside output dir to ensure same drive
        temp_dir = self.output_dir / f"temp_{case_name}"
        if temp_dir.exists():
            shutil.rmtree(temp_dir)

        try:
            # 1. Copy template to temp dir
            shutil.copytree(self.template_dir, temp_dir)

            # 2. Update files
            self.update_placeholders(temp_dir, ohif_url, patient_id, structure_name)
            self.update_manifest(temp_dir, case_name)

            # 3. Create Zip
            zip_path = self.create_zip_file(temp_dir, case_name)
            return str(zip_path)

        finally:
            # 4. Cleanup
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

def get_downloads_folder():
    """Returns the path to the user's Downloads folder."""
    if os.name == 'nt':
        import ctypes
        from ctypes import windll, wintypes
        GUID_DOWNLOAD = '{374DE290-123F-4565-9164-39C4925E467B}'
        ptr = ctypes.c_wchar_p()
        if windll.shell32.SHGetKnownFolderPath(ctypes.create_unicode_buffer(GUID_DOWNLOAD), 0, None, ctypes.byref(ptr)) == 0:
            return ptr.value
        return os.path.expanduser('~\\Downloads')
    else:
        return os.path.expanduser('~/Downloads')

def get_gui_inputs():
    """
    Displays a GUI window to collect OHIF URL, Patient ID, and Structure.
    Auto-generates Case Name as 'PatientID (Structure)'.
    Returns a tuple (case_name, ohif_url, patient_id, structure_name) or (None, None, None, None) if cancelled.
    """
    root = tk.Tk()
    root.title("SCORM Package Generator")
    root.geometry("500x380")

    # Modern Dark Theme Colors
    BG_COLOR = "#2b2b2b"
    FG_COLOR = "#ffffff"
    ENTRY_BG = "#3b3b3b"
    ENTRY_FG = "#ffffff"
    BUTTON_BG = "#007bff"
    BUTTON_FG = "#ffffff"
    BUTTON_ACTIVE_BG = "#0056b3"

    root.configure(bg=BG_COLOR)

    # Center window
    root.eval('tk::PlaceWindow . center')

    inputs = {"case_name": None, "ohif_url": None, "patient_id": None, "structure_name": None}

    # Styles
    label_font = ("Segoe UI", 10)
    entry_font = ("Segoe UI", 10)

    def create_label(text):
        lbl = tk.Label(root, text=text, bg=BG_COLOR, fg=FG_COLOR, font=label_font)
        lbl.pack(pady=(15, 5))
        return lbl

    def create_entry(default_text=""):
        ent = tk.Entry(root, width=45, bg=ENTRY_BG, fg=ENTRY_FG,
                       insertbackground="white", relief="flat", font=entry_font)
        # Add internal padding
        ent.pack(ipady=4)
        if default_text:
            ent.insert(0, default_text)
        return ent

    create_label("OHIF URL:")
    url_entry = create_entry()

    create_label("Patient ID (DICOM Tag 0010,0020):")
    patient_entry = create_entry(default_text="SBRT_Spine")

    create_label("Structure Names (separated by ';'):")
    structure_entry = create_entry()

    def on_submit():
        url = url_entry.get().strip()
        patient = patient_entry.get().strip()
        structure_input = structure_entry.get().strip()

        if not url or not patient or not structure_input:
            messagebox.showerror("Error", "All fields (URL, Patient ID, Structure) are required.")
            return

        # Pass the raw structure input to main for processing
        # We don't generate a single 'case_name' anymore, so we can pass None or a placeholder

        inputs["case_name"] = "MULTI_BATCH"
        inputs["ohif_url"] = url
        inputs["patient_id"] = patient
        inputs["structure_name"] = structure_input
        root.quit() # Stop mainloop
        root.destroy() # Close window

    submit_btn = tk.Button(root, text="Generate Package", command=on_submit,
                           bg=BUTTON_BG, fg=BUTTON_FG,
                           activebackground=BUTTON_ACTIVE_BG, activeforeground="white",
                           relief="flat", font=("Segoe UI", 10, "bold"), padx=20, pady=8, cursor="hand2")
    submit_btn.pack(pady=30)

    # Handle window close button
    def on_closing():
        root.destroy()
        sys.exit(0) # Exit cleanly if window closed

    root.protocol("WM_DELETE_WINDOW", on_closing)

    root.mainloop()

    return inputs["case_name"], inputs["ohif_url"], inputs["patient_id"], inputs["structure_name"]

def main():
    try:
        # 1. Get Inputs via GUI
        # Note: 'case_name' is returned as a placeholder "MULTI_BATCH" now
        _, ohif_url, patient_id, structure_name_input = get_gui_inputs()

        if not ohif_url or not patient_id or not structure_name_input:
            # Should be handled by sys.exit in on_closing, but just in case
            return

        # 2. Determine paths
        # Assume scorm-template is in the same directory as the script
        script_dir = Path(__file__).parent.absolute()
        template_dir = script_dir / "scorm-template"
        output_dir = get_downloads_folder()

        if not template_dir.exists():
            messagebox.showerror("Error", f"Template directory not found at:\n{template_dir}")
            return

        # 3. Generate Packages
        generator = ScormPackageGenerator(template_dir, output_dir)

        # Split structures by semicolon
        structures = [s.strip() for s in structure_name_input.split(';') if s.strip()]

        generated_files = []
        errors = []

        for struct in structures:
            try:
                # Generate specific case name for this structure
                current_case_name = f"{patient_id} ({struct})"

                zip_path = generator.create_package(current_case_name, ohif_url, patient_id, struct)
                generated_files.append(Path(zip_path).name)
            except Exception as e:
                errors.append(f"Failed to generate for '{struct}': {str(e)}")

        # 4. Show Summary
        if not errors:
            file_list = "\n".join(generated_files)
            messagebox.showinfo("Success", f"Successfully generated {len(generated_files)} packages!\n\nFiles:\n{file_list}\n\nSaved to:\n{output_dir}")
        else:
            success_msg = f"Generated {len(generated_files)} packages.\n" if generated_files else ""
            error_msg = "\n".join(errors)
            messagebox.showwarning("Partial Success/Error", f"{success_msg}\nErrors occurred:\n{error_msg}\n\nCheck output folder for any successful files.")

    except Exception as e:
        messagebox.showerror("Error", f"An unexpected error occurred:\n{str(e)}")
        # Print stack trace to console just in case
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
