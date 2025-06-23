import os
import sys
import subprocess
import argparse
from pathlib import Path

def convert_markdown_to_pdf(input_file, debug=False):
    """
    Convert a Markdown file to PDF using a two-step process:
    1. Pandoc: Convert Markdown to HTML
    2. WeasyPrint: Convert HTML to PDF
    
    Args:
        input_file (str): Path to the input Markdown file
        css_file (str, optional): Path to the CSS file for styling
        output_file (str, optional): Path to the output PDF file. If not provided, 
                                     uses the input filename with .pdf extension
        debug_html (bool, optional): If True, saves the intermediate HTML file
    """
    # Get absolute paths
    input_path = Path(input_file).resolve()
    
    # Check build directory
    dist_dir = input_path.parent.parent / "dist"
    if not dist_dir.exists():
        print(f"Dist directory does not exist: {dist_dir}")
        os.makedirs(dist_dir)

    # Create a HTML file path and remove .tmp
    html_path = os.path.basename(input_path).replace('.tmp.md', '.html')
    html_path = dist_dir / html_path
    
    # Step 1: Build the Pandoc command to generate HTML
    pandoc_command = [
        'pandoc', 
        str(input_path),
        '--from', 'gfm',
        '--to', 'html5',
        '--toc',
        '--toc-depth=3',
        '--standalone',
        '--template=templates/custom.html',
        '--output', str(html_path)
    ]
    
    # Search css in css folder
    cwd_path = Path.cwd()
    styles_path = cwd_path / 'css'
    print (f"Searching for CSS files in: {styles_path}")
    css_files = list(styles_path.glob('*.css'))
    # Sort CSS files with minimal-style.css first
    sorted_css_files = sorted(css_files, key=lambda x: (0 if x.name == "minimal-style.css" else 1, x.name))
    for css_file in sorted_css_files:
        if css_file.is_file():
            print(f"Found CSS file: {css_file}")
            # Add the CSS file to the Pandoc command
            pandoc_command.append('--css')
            pandoc_command.append(str(css_file))
    
    print(f"Step 1: Converting Markdown to HTML")
    print(f"Running: {' '.join(pandoc_command)}")
    
    try:
        # Run the Pandoc HTML generation command
        result = subprocess.run(
            pandoc_command,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"Successfully created HTML: {html_path}")

        
    except subprocess.CalledProcessError as e:
        print(f"Error converting {input_path} to HTML:")
        print(f"Return code: {e.returncode}")
        print(f"Error output: {e.stderr}")
        return False, e.stderr
    
    if not debug:
        # remove the temporary Markdown file if debug is not enabled
        directory = input_path.parent
        print(f"Removing temporary Markdown file: {directory}")
        # Remove all .tmp.md files in the directory
        for tmp_file in directory.rglob('*.tmp.md'):
            if tmp_file.is_file():
                print(f"Removing file: {tmp_file}")
                tmp_file.unlink()   
        directory.rmdir()
    
    return True, "Conversion completed successfully."
    # Step 2: Use WeasyPrint directly to convert HTML to PDF
    # print(f"Step 2: Converting HTML to PDF with WeasyPrint")
    
    # try:
    #     # If CSS is provided, we'll include it in the WeasyPrint conversion
    #     css_files = []
    #     if css_file:
    #         css_files.append(str(css_path))
        
    #     # Generate PDF with WeasyPrint
    #     html = weasyprint.HTML(filename=str(html_path))
    #     html.write_pdf(str(output_path), stylesheets=css_files)
        
    #     print(f"Successfully created PDF: {output_path}")
        
    #     # Remove the temporary HTML file unless debug_html is True
    #     if not debug_html:
    #         os.remove(html_path)
    #     else:
    #         # If debug is enabled, rename the file to .debug.html
    #         debug_html_path = input_path.with_suffix('.debug.html')
    #         if html_path != debug_html_path:  # Only rename if different
    #             if os.path.exists(debug_html_path):
    #                 os.remove(debug_html_path)
    #             os.rename(html_path, debug_html_path)
    #             print(f"Saved debug HTML file: {debug_html_path}")
    #         else:
    #             print(f"Saved debug HTML file: {html_path}")
                
    #     return True, "Conversion completed successfully."
        
    # except Exception as e:
    #     print(f"Error converting HTML to PDF:")
    #     print(f"Error: {str(e)}")
    #     return False, str(e)

def main():
    # Set up command-line argument parser
    parser = argparse.ArgumentParser(description='Convert Markdown files to PDF using Pandoc and WeasyPrint')
    parser.add_argument('input_file', help='Path to the input Markdown file')
    parser.add_argument('--output', help='Path to the output PDF file', default="output.pdf")
    parser.add_argument('--debug', action='store_true', help='Save intermediate Markdown file for debugging')
    
    args = parser.parse_args()
    
    # Run the conversion
    success, output = convert_markdown_to_pdf(args.input_file)
    
    # Exit with appropriate status code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
