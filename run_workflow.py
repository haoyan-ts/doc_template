import os
import sys
import subprocess
import glob
from pathlib import Path
import importlib.util

def run_generate_tmp():
    """
    Run the generate_tmp.py script to process markdown files
    """
    print("Step 1: Running generate_tmp.py to process markdown files...")
    
    # Import the generate_tmp module
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate_tmp.py")
    spec = importlib.util.spec_from_file_location("generate_tmp", script_path)
    generate_tmp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generate_tmp)
    
    # Run the generate_tmp_files function
    generate_tmp.generate_tmp_files()
    print("Markdown processing completed successfully!")

def run_convert_to_pdf():
    """
    Run the convert_to_pdf.py script to convert processed markdown files to PDF
    """
    print("\nStep 2: Running convert_to_pdf.py to generate PDF files...")
    
    # Import the convert_to_pdf module
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "convert_to_pdf.py")
    spec = importlib.util.spec_from_file_location("convert_to_pdf", script_path)
    convert_to_pdf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(convert_to_pdf)
    
    # Find all temporary markdown files
    tmp_dir = os.path.join(os.getcwd(), "tmp")
    tmp_files = glob.glob(os.path.join(tmp_dir, "*.tmp.md"))
    
    if not tmp_files:
        print("No temporary markdown files found to convert.")
        return False
    
    # Process each tmp file
    success_count = 0
    for tmp_file in tmp_files:
        print(f"Converting {os.path.basename(tmp_file)} to PDF...")
        success, message = convert_to_pdf.convert_markdown_to_pdf(tmp_file)
        
        if success:
            success_count += 1
        else:
            print(f"Failed to convert {tmp_file}: {message}")
    
    print(f"PDF conversion completed. Successfully converted {success_count} of {len(tmp_files)} files.")
    return success_count > 0

def main():
    """
    Main function to run the complete workflow:
    1. Generate temporary markdown files
    2. Convert them to PDF
    """
    print("Starting document conversion workflow...")
    
    # Run generate_tmp.py
    run_generate_tmp()
    
    # Run convert_to_pdf.py
    pdf_success = run_convert_to_pdf()
    
    if pdf_success:
        print("\nWorkflow completed successfully!")
        print("PDF files are available in the 'dist' directory.")
    else:
        print("\nWorkflow completed with errors. Please check the messages above.")

if __name__ == "__main__":
    main()
