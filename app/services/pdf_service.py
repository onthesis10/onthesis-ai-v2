import os
from flask import render_template
from playwright.sync_api import sync_playwright
import base64

class PdfService:
    @staticmethod
    def generate_pdf(data):
        """
        Generates PDF by spawning a separate process to run pdf_worker.py.
        This avoids threading/signal issues with Flask+Playwright on Windows.
        """
        import subprocess
        import json
        import tempfile
        import os
        import sys

        print("PdfService: Delegating to subprocess worker...")

        # Paths
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # Root of project
        worker_script = os.path.join(base_dir, 'app', 'services', 'pdf_worker.py')
        template_dir = os.path.join(base_dir, 'app', 'templates')
        
        # Create Temp Files
        fd_in, input_path = tempfile.mkstemp(suffix='.json')
        fd_out, output_path = tempfile.mkstemp(suffix='.pdf')
        os.close(fd_in)
        os.close(fd_out)

        try:
            # 1. Write Input Data
            with open(input_path, 'w', encoding='utf-8') as f:
                json.dump(data, f)
            
            # 2. Run Subprocess
            # python app/services/pdf_worker.py <input> <output> <templates>
            cmd = [sys.executable, worker_script, input_path, output_path, template_dir]
            print(f"PdfService: Running command: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            print(f"Worker STDOUT: {result.stdout}")
            print(f"Worker STDERR: {result.stderr}")
            
            if result.returncode != 0:
                raise Exception(f"PDF Worker failed with code {result.returncode}: {result.stderr}")

            # 3. Read Output
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                 raise Exception("PDF Worker did not produce an output file.")

            with open(output_path, 'rb') as f:
                pdf_bytes = f.read()
                
            return pdf_bytes

        finally:
            # 4. Cleanup
            if os.path.exists(input_path):
                try: os.remove(input_path) 
                except: pass
            if os.path.exists(output_path):
                try: os.remove(output_path)
                except: pass
