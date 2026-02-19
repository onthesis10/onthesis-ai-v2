import os
from app import create_app
from app.services.pdf_service import PdfService
from flask import render_template

# Dummy Data for Testing
mock_data = {
    "meta": {
        "title": "Test Report",
        "author": "Tester",
        "date": "2024-02-04"
    },
    "sections": [
        {
            "type": "heading",
            "level": 1,
            "content": "Test Heading"
        },
        {
            "type": "paragraph",
            "content": "This is a test paragraph to verify PDF generation logic."
        }
    ]
}

def test_generation():
    print("Initializing Flask App context...")
    app = create_app()
    
    with app.app_context():
        print("Starting PDF Generation Test...")
        try:
            # We mock the service call partially or just call it if methods are static
            # Since PdfService.generate_pdf calls render_template, it needs app_context (which we have)
            
            pdf = PdfService.generate_pdf(mock_data)
            print(f"SUCCESS: PDF Generated. Size: {len(pdf)} bytes")
            
            with open("test_output.pdf", "wb") as f:
                f.write(pdf)
            print("Saved to test_output.pdf")
            
        except Exception as e:
            print("FAILED with error:")
            print(e)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_generation()
