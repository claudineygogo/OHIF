import sys
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path
import os

# We need to mock tkinter BEFORE importing the module, because it might try to open a window on import or instantiation
# However, our script only uses tkinter in get_gui_inputs().
# But we need to make sure we don't actually run mainloop or Create Tk() during import if generic code does.
# Our script protects main execution with if __name__ == "__main__", so safe to import.

import importlib.util
spec = importlib.util.spec_from_file_location("package_generator", "package-generator.py")
pg = importlib.util.module_from_spec(spec)
sys.modules["package_generator"] = pg
spec.loader.exec_module(pg)

class TestGuiWorkflow(unittest.TestCase):

    @patch('package_generator.get_gui_inputs')
    @patch('package_generator.get_downloads_folder')
    @patch('package_generator.ScormPackageGenerator')
    @patch('package_generator.messagebox')
    def test_main_workflow(self, mock_mb, mock_gen_class, mock_get_downloads, mock_get_inputs):
        # 1. Setup Mock Inputs
        mock_get_inputs.return_value = ("gui-test-case", "https://test.ohif.com/gui-case-1")
        mock_get_downloads.return_value = "/fake/user/Downloads"
        
        # Mock the generator instance
        mock_gen_instance = MagicMock()
        mock_gen_instance.create_package.return_value = "/fake/user/Downloads/gui-test-case.zip"
        mock_gen_class.return_value = mock_gen_instance

        # Mock template dir existence check logic inside main
        # We need to ensure logic flow doesn't break if template dir assumes __file__ location
        # The script uses Path(__file__).parent / "scorm-template"
        # We can simulate the existence of the template dir by mocking Path.exists, 
        # but simpler is just to let it run and mock the internal logic if needed.
        # Actually, main() creates a Path object. We can mock Path.exists.
        
        with patch('pathlib.Path.exists') as mock_exists:
            mock_exists.return_value = True # Pretend template dir exists
            
            # 2. Run Main
            pg.main()

        # 3. Assertions
        
        # Assert Inputs collected
        mock_get_inputs.assert_called_once()
        mock_get_downloads.assert_called_once()
        
        # Assert Generator Instantiation
        # Need to check arguments passed to constructor
        # 1st arg: should be the resolved path to scorm-template (we can't easily check exact path string without complex mocks, but we can check the 2nd arg)
        # 2nd arg: output_dir (/fake/user/Downloads)
        args, _ = mock_gen_class.call_args
        self.assertEqual(args[1], "/fake/user/Downloads")
        
        # Assert create_package called with correct args
        mock_gen_instance.create_package.assert_called_once_with("gui-test-case", "https://test.ohif.com/gui-case-1")
        
        # Assert Success message shown
        mock_mb.showinfo.assert_called_once()
        self.assertIn("Success", mock_mb.showinfo.call_args[0][0])

if __name__ == '__main__':
    unittest.main()
