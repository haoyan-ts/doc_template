import os
import glob


def generate_tmp_files():
    """
    Function to process Markdown files in the docs directory:
    1. Load MD files under "docs"
    2. Create a string stream named "[filename].tmp.md"
    3. Add content from pre-template.html at the beginning of tmp file
    4. Wrap the original content with "<div id="maincontent">" tag
    5. Add content from after-template.html at the end of the tmp file
    6. Save to file
    """
    # Get the absolute path of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Get the working directory
    working_dir = os.getcwd()
    
    # Get the docs directory path
    docs_dir = os.path.join(script_dir, "docs")
    
    # Get the templates directory path
    templates_dir = os.path.join(script_dir, "templates")
    
    # Path to template files
    before_template_path = os.path.join(templates_dir, "before-template.html")
    after_template_path = os.path.join(templates_dir, "after-template.html")
    
    # Check if the tmp directory exists
    tmp_dir = os.path.join(working_dir, "tmp")
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)

    # Read template files
    with open(before_template_path, 'r', encoding='utf-8') as file:
        before_template_content = file.read()
    
    with open(after_template_path, 'r', encoding='utf-8') as file:
        after_template_content = file.read()
    
    # Find all markdown files in the docs directory
    md_files = glob.glob(os.path.join(docs_dir, "*.md"))
    
    # Process each markdown file
    for md_file in md_files:
        # Get the filename without extension
        base_name = os.path.basename(md_file)
        file_name_without_ext = os.path.splitext(base_name)[0]
        
        # Create the output file path (in the same directory as the input)
        output_file_path = os.path.join(tmp_dir, f"{file_name_without_ext}.tmp.md")
        
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
        
        print(f"Processed {base_name} -> {file_name_without_ext}.tmp.md")

if __name__ == "__main__":
    generate_tmp_files()
    print("All Markdown files processed successfully!")