# Document Generator Service

A Node.js TypeScript service that converts Markdown files to HTML and PDF with beautiful styling.

## Features

- 📤 **File Upload**: Web interface for uploading Markdown files
- 🔄 **Real-time Processing**: Live updates on processing status
- 📄 **HTML Generation**: Convert Markdown to styled HTML using Pandoc
- 🎨 **Static Rendering**: Use Puppeteer for fully rendered HTML
- 📑 **PDF Generation**: Generate PDFs using WeasyPrint
- 📦 **ZIP Archives**: Bundle HTML and PDF files
- 💫 **Beautiful UI**: Modern, responsive web interface

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Pandoc** - Document converter
3. **WeasyPrint** - PDF generator
4. **Python** (for WeasyPrint)

### Installing Prerequisites

#### Windows
```powershell
# Install Node.js from https://nodejs.org/

# Install Pandoc
winget install pandoc

# Install Python and WeasyPrint
python -m pip install weasyprint
```

#### macOS
```bash
# Install Node.js
brew install node

# Install Pandoc
brew install pandoc

# Install WeasyPrint
pip install weasyprint
```

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Pandoc
sudo apt-get install pandoc

# Install WeasyPrint
pip install weasyprint
```

## Installation

1. **Clone or navigate to the project directory**
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the TypeScript code**:
   ```bash
   npm run build
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The service will be available at `http://localhost:3000`

## API Endpoints

### Upload Files
- `POST /api/upload` - Upload single Markdown file
- `POST /api/upload/multiple` - Upload multiple Markdown files

### Download Files
- `GET /api/download/:jobId/html` - Download HTML file
- `GET /api/download/:jobId/pdf` - Download PDF file
- `GET /api/download/:jobId/zip` - Download ZIP archive

### Job Management
- `GET /api/files` - Get all processing jobs
- `GET /api/files/:jobId` - Get specific job details

## File Processing Workflow

1. **Upload**: Markdown files are uploaded via the web interface
2. **Processing**: Files go through several stages:
   - `uploaded` - File received and queued
   - `processing` - Converting and rendering
   - `processed` - All files generated successfully
   - `error` - Processing failed

3. **Generation Steps**:
   - Convert Markdown to HTML using Pandoc with custom templates
   - Render static HTML using Puppeteer (executes JavaScript)
   - Generate PDF from static HTML using WeasyPrint
   - Create ZIP archive containing both HTML and PDF

## Project Structure

```
src/
├── app.ts                 # Main application entry point
├── services/
│   └── DocumentService.ts # Core document processing logic
└── routes/
    ├── upload.ts          # File upload handling
    ├── download.ts        # File download handling
    └── files.ts           # Job management
public/
└── index.html            # Upload web interface
templates/                # Pandoc HTML templates
├── custom.html
├── before-template.html
└── after-template.html
css/                      # Stylesheets for generated documents
├── minimal-style.css
└── tokyo-night-light.css
```

## Configuration

The service uses the following default directories:
- `uploads/` - Temporary storage for uploaded files
- `output/` - Generated files organized by type:
  - `output/html/` - HTML files
  - `output/pdf/` - PDF files
  - `output/zip/` - ZIP archives

## Real-time Updates

The web interface uses Socket.IO for real-time updates on job processing status. Jobs are automatically refreshed when their status changes.

## Error Handling

- File validation (Markdown files only)
- Size limits (10MB per file)
- Processing error reporting
- Graceful failure handling

## Development

### Scripts
- `npm run build` - Compile TypeScript
- `npm run dev` - Development mode with hot reload
- `npm start` - Production mode
- `npm run clean` - Clean build directory

### Adding Custom Styling

1. Add CSS files to the `css/` directory
2. The service automatically includes all CSS files when generating HTML
3. Modify `templates/custom.html` for custom Pandoc templates

## Troubleshooting

### Common Issues

1. **Pandoc not found**
   - Ensure Pandoc is installed and available in PATH
   - Test with: `pandoc --version`

2. **WeasyPrint not found**
   - Ensure Python and WeasyPrint are installed
   - Test with: `weasyprint --version`

3. **Port already in use**
   - Change the port by setting environment variable: `PORT=3001`

4. **Upload fails**
   - Check file size (max 10MB)
   - Ensure files are Markdown (.md extension)

## License

MIT License - see LICENSE file for details
