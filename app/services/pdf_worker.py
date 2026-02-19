import sys
import json
import os
from flask import Flask, render_template
from playwright.sync_api import sync_playwright

# Setup minimal Flask context just for template rendering
# We need to mimic the app structure to find templates
def generate_pdf_in_process(input_path, output_path, template_folder):
    print(f"Worker: Starting. Input={input_path}, Output={output_path}")
    
    # 1. Load Data
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Worker Error: Could not load input JSON: {e}")
        sys.exit(1)

    # 2. Render Template
    # We create a dummy flask app pointing to the correct template folder
    try:
        app = Flask(__name__, template_folder=template_folder)
        with app.app_context():
            # Support multiple templates
            template_name = data.get('template', 'academic_report')
            template_path = f'export/{template_name}.html'
            html_content = render_template(template_path, data=data)
        print(f"Worker: HTML Rendered using template: {template_path}")
    except Exception as e:
        print(f"Worker Error: Template rendering failed: {e}")
        sys.exit(1)

    # Load Logo for Header
    logo_base64 = ""
    try:
        # Try multiple potential paths for the logo
        possible_logo_paths = [
            os.path.join(template_folder, '..', 'static', 'images', 'onthesis-logo-new.png'),
            os.path.join(os.getcwd(), 'app', 'static', 'images', 'onthesis-logo-new.png'),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static', 'images', 'onthesis-logo-new.png')
        ]
        
        logo_path = None
        for path in possible_logo_paths:
            abs_path = os.path.abspath(path)
            if os.path.exists(abs_path):
                logo_path = abs_path
                break
        
        if logo_path:
            import base64
            with open(logo_path, "rb") as image_file:
                logo_base64 = base64.b64encode(image_file.read()).decode('utf-8')
            print(f"Worker: Logo loaded from {logo_path}")
        else:
            print("Worker Warning: Could not find logo in any expected location.")
    except Exception as e:
        print(f"Worker Warning: Error loading logo: {e}")

    # 3. Playwright
    try:
        with sync_playwright() as p:
            print("Worker: Launching Browser...")
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            page = browser.new_page()
            
            print("Worker: Setting content...")
            page.set_content(html_content, wait_until="load")
            
            print("Worker: Printing PDF...")
            
            # Clean Header Template (SVG Logo from OnThesisLogo.tsx)
            header_html = f'''
            <div style="font-size: 9px; width: 100%; margin: 0 1cm; display: flex; align-items: center; justify-content: flex-end; padding-bottom: 5px;">
                <svg width="100" height="28" viewBox="0 0 560 140" xmlns="http://www.w3.org/2000/svg">
                    <g>
                        <rect x="40" y="42" width="40" height="8" rx="4" fill="#0284c7" />
                        <rect x="30" y="56" width="60" height="8" rx="4" fill="#0284c7" />
                        <rect x="26" y="70" width="68" height="8" rx="4" fill="#0284c7" />
                        <rect x="30" y="84" width="60" height="8" rx="4" fill="#0284c7" />
                        <rect x="40" y="98" width="40" height="8" rx="4" fill="#0284c7" />
                    </g>
                    <text x="110" y="92" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#0284c7">OnThesis</text>
                </svg>
            </div>
            '''
            
            footer_html = '''
            <div style="font-size: 8px; width: 100%; text-align: center; color: #999;">
                OnThesis.pro
            </div>
            '''

            pdf_bytes = page.pdf(
                format="A4",
                print_background=True,
                margin={
                    "top": "1.5cm", # Reduced since header_template takes space
                    "right": "2.54cm",
                    "bottom": "1.5cm",
                    "left": "2.54cm"
                },
                display_header_footer=True,
                header_template=header_html,
                footer_template=footer_html
            )
            browser.close()
            
            # 4. Save Output
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            
            print("Worker: PDF Saved.")
            
    except Exception as e:
        print(f"Worker Error: Playwright failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_worker.py <input_json> <output_pdf> <template_dir>")
        sys.exit(1)
        
    input_json = sys.argv[1]
    output_pdf = sys.argv[2]
    # template dir passed or assumed relative
    template_dir = sys.argv[3] if len(sys.argv) > 3 else 'templates'
    
    generate_pdf_in_process(input_json, output_pdf, template_dir)
