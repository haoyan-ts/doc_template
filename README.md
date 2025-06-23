# Document Converter

A tool for converting Markdown documents to beautifully styled HTML documents suitable for printing or sharing. This project wraps Markdown content with customizable HTML templates and uses Pandoc to generate the final output.

## Features

- Convert Markdown files to HTML with consistent styling
- Apply custom HTML templates and CSS
- Table of contents generation
- Code syntax highlighting
- Print-ready output
- Support for multiple CSS themes

## Requirements

- Python 3.6+
- Pandoc Installation
    - Windows users:
        - Using [Scoop](https://scoop.sh/) (recommended for convenience): 
            ```
            scoop install pandoc
            ```
        - Or [download the installer](https://pandoc.org/installing.html)
    - macOS: `brew install pandoc`
    - Linux: Use your package manager (e.g., `apt install pandoc`)
    - Verify installation with `pandoc --version`

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/doc_template.git
   cd doc_template
   ```

2. No additional Python package installation is required, as the script uses standard libraries.

## Usage

### Basic Usage

Place your Markdown files in the `docs` directory, then run:

```bash
python document_converter.py
```

HTML files will be generated in the `dist` directory.

### Build Procedure

1. Run the converter script:
   ```bash
   python document_converter.py
   ```
2. Open the generated HTML files in a browser
3. Print using the browser's print function (or save as PDF)

### Command Line Options

```bash
python document_converter.py [--debug] [--input-dir DIRECTORY] [--output-dir DIRECTORY]
```

- `--debug`: Keep intermediate files for debugging
- `--input-dir`: Directory containing markdown files (default: docs)
- `--output-dir`: Directory for output files (default: dist)

## Workflow

1. Markdown files from the input directory are processed with:
   - Content from `templates/before-template.html` added at the beginning
   - Original content wrapped with `<div id="maincontent">` tags
   - Content from `templates/after-template.html` added at the end
2. Processed Markdown files are converted to HTML using Pandoc
3. CSS files from the `css` directory are applied to the HTML output

## Project Structure

```
.
├── document_converter.py   # Main script
├── css/                    # CSS styles for output HTML
│   ├── minimal-style.css   # Primary styling
│   └── tokyo-night-light.css
├── docs/                   # Place your Markdown files here
│   └── sample.md           # Example document
├── templates/              # HTML templates
│   ├── after-template.html
│   ├── before-template.html
│   └── custom.html         # Pandoc HTML template
└── README.md               # This file
```

## Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Credits

- [Pandoc](https://pandoc.org/) - Used for document conversion
- [highlight.js](https://highlightjs.org/) - For code syntax highlighting
- [Noto Sans](https://fonts.google.com/noto) - Default font family