#!/usr/bin/env python3
"""
Document Converter

A unified script that handles the complete document conversion workflow:
1. Process Markdown files with HTML templates
2. Convert processed Markdown to HTML using Pandoc

Usage:
    python document_converter.py [--debug] [--input-dir DIRECTORY] [--output-dir DIRECTORY]

Options:
    --debug         Save intermediate files for debugging
    --input-dir     Directory containing markdown files (default: docs)
    --output-dir    Directory for output files (default: dist)
"""

import os
import sys
import glob
import argparse
import subprocess
from pathlib import Path


def generate_tmp_files(input_dir="docs", tmp_dir="tmp", debug=False):
    """
    Process Markdown files in the input directory:
    1. Load MD files from input directory
    2. Create processed markdown files in tmp directory
    3. Add content from before-template.html at the beginning
    4. Wrap original content with "<div id="maincontent">" tag
    5. Add content from after-template.html at the end
    
    Args:
        input_dir (str): Directory containing markdown files
        tmp_dir (str): Directory to store processed markdown files
        debug (bool): Whether to keep intermediate files
    
    Returns:
        list: Paths of generated temporary markdown files
    """
    # Get the absolute path of the current script
    script_dir = Path(__file__).parent.absolute()
    
    # Ensure paths are absolute
    input_dir_path = Path(input_dir) if os.path.isabs(input_dir) else script_dir / input_dir
    tmp_dir_path = Path(tmp_dir) if os.path.isabs(tmp_dir) else Path.cwd() / tmp_dir
    templates_dir = script_dir / "templates"
    
    # Path to template files
    before_template_path = templates_dir / "before-template.html"
    after_template_path = templates_dir / "after-template.html"
    
    # Check if the tmp directory exists
    if not tmp_dir_path.exists():
        tmp_dir_path.mkdir(parents=True)

    # Read template files
    with open(before_template_path, 'r', encoding='utf-8') as file:
        before_template_content = file.read()
    
    with open(after_template_path, 'r', encoding='utf-8') as file:
        after_template_content = file.read()
    
    # Find all markdown files in the input directory
    md_files = list(input_dir_path.glob("*.md"))
    generated_files = []
    
    # Process each markdown file
    for md_file in md_files:
        # Get the filename without extension
        file_name_without_ext = md_file.stem
        
        # Create the output file path
        output_file_path = tmp_dir_path / f"{file_name_without_ext}.tmp.md"
        
        # Read the content of the original markdown file
        with open(md_file, 'r', encoding='utf-8') as file:
            original_content = file.read()
        
        # Wrap the original content with maincontent div
        main_content = f'''<div id="maincontent">

{original_content}

</div>'''
        
        # Create the new content by concatenating pre-template, main content, and after-template
        new_content = before_template_content + "\n\n" + main_content + "\n\n" + after_template_content
        
        # Write the new content to the output file
        with open(output_file_path, 'w', encoding='utf-8') as file:
            file.write(new_content)
        
        generated_files.append(str(output_file_path))
        print(f"Processed {md_file.name} -> {output_file_path.name}")
    
    return generated_files


def convert_to_html(input_file, output_dir="dist", debug=False):
    """
    Convert a processed Markdown file to HTML using Pandoc
    
    Args:
        input_file (str): Path to the processed Markdown file
        output_dir (str): Directory to store output HTML files
        debug (bool): Whether to keep intermediate files
    
    Returns:
        tuple: (success, message, html_path)
    """
    # Get absolute paths
    input_path = Path(input_file).resolve()
    
    # Check output directory
    dist_dir = Path(output_dir) if os.path.isabs(output_dir) else Path.cwd() / output_dir
    if not dist_dir.exists():
        print(f"Output directory does not exist: {dist_dir}")
        dist_dir.mkdir(parents=True)

    # Create a HTML file path and remove .tmp
    html_filename = input_path.name.replace('.tmp.md', '.html')
    html_path = dist_dir / html_filename
    
    # Build the Pandoc command to generate HTML
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
    css_dir = Path(__file__).parent.absolute() / 'css'
    print(f"Searching for CSS files in: {css_dir}")
    css_files = list(css_dir.glob('*.css'))
    
    # Sort CSS files with minimal-style.css first
    sorted_css_files = sorted(css_files, key=lambda x: (0 if x.name == "minimal-style.css" else 1, x.name))
    
    for css_file in sorted_css_files:
        if css_file.is_file():
            print(f"Found CSS file: {css_file}")
            # Add the CSS file to the Pandoc command
            pandoc_command.append('--css')
            pandoc_command.append(str(css_file))
    
    print(f"Converting Markdown to HTML")
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
        return False, e.stderr, None
    
    if not debug:
        # Clean up the temporary Markdown file if debug is not enabled
        if input_path.exists():
            print(f"Removing temporary file: {input_path}")
            input_path.unlink()
            
        # Try to remove the tmp directory if it's empty
        tmp_dir = input_path.parent
        if tmp_dir.exists() and not any(tmp_dir.iterdir()):
            try:
                tmp_dir.rmdir()
                print(f"Removed empty directory: {tmp_dir}")
            except:
                pass
    
    return True, "HTML conversion completed successfully.", html_path

def run_workflow(input_dir="docs", output_dir="dist", debug=False):
    """
    Run the complete document conversion workflow
    
    Args:
        input_dir (str): Directory containing markdown files
        output_dir (str): Directory for output files
        debug (bool): Whether to keep intermediate files
    
    Returns:
        bool: Whether the workflow completed successfully
    """
    print("Starting document conversion workflow...")
    
    # Step 1: Generate temporary markdown files
    print("\nStep 1: Processing markdown files...")
    tmp_files = generate_tmp_files(input_dir, "tmp", debug)
    
    if not tmp_files:
        print("No markdown files found to process.")
        return False
    
    # Step 2: Convert temporary markdown files to HTML
    print("\nStep 2: Converting processed markdown to HTML...")
    html_files = []
    
    for tmp_file in tmp_files:
        print(f"\nProcessing {os.path.basename(tmp_file)}...")
        success, message, html_path = convert_to_html(tmp_file, output_dir, debug)
        
        if success and html_path:
            html_files.append(html_path)
        else:
            print(f"Failed to convert {tmp_file}: {message}")
    
    if not html_files:
        print("No HTML files were generated. Workflow failed.")
        return False
    
    # Final success message
    print(f"\nWorkflow completed successfully!")
    print(f"HTML files are available in the '{output_dir}' directory.")
    return True


def main():
    """
    Parse command-line arguments and run the workflow
    """
    parser = argparse.ArgumentParser(
        description="Convert Markdown files to HTML with templates",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("\n\n")[0]  # Use the module docstring as epilog
    )
    
    parser.add_argument('--debug', action='store_true', 
                      help='Keep intermediate files for debugging')
    parser.add_argument('--input-dir', default='docs',
                      help='Directory containing markdown files (default: docs)')
    parser.add_argument('--output-dir', default='dist',
                      help='Directory for output files (default: dist)')
    
    args = parser.parse_args()
    
    # Run the workflow
    success = run_workflow(
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        debug=args.debug
    )
    
    # Exit with appropriate status code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
