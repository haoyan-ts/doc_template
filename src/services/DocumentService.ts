import { Server } from 'socket.io';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import archiver from 'archiver';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessingJob {
  id: string;
  fileName: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  createdAt: Date;
  completedAt?: Date;
  files?: {
    html?: string;
    pdf?: string;
    zip?: string;
  };
  error?: string;
}

export class DocumentService {
  private jobs: Map<string, ProcessingJob> = new Map();
  private io: Server;
  private uploadDir = path.join(process.cwd(), 'uploads');
  private outputDir = path.join(process.cwd(), 'output');

  constructor(io: Server) {
    this.io = io;
    this.initializeDirectories();
  }

  private async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'html'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'pdf'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'zip'), { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async processMarkdownFile(filePath: string, fileName: string): Promise<string> {
    const jobId = uuidv4();
    const job: ProcessingJob = {
      id: jobId,
      fileName,
      status: 'uploaded',
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.emitJobUpdate(job);

    // Start processing asynchronously
    this.processFile(jobId, filePath).catch((error) => {
      console.error(`Processing failed for job ${jobId}:`, error);
      job.status = 'error';
      job.error = error.message;
      this.emitJobUpdate(job);
    });

    return jobId;
  }

  private async processFile(jobId: string, filePath: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Update status to processing
      job.status = 'processing';
      this.emitJobUpdate(job);

      const baseName = path.parse(job.fileName).name;
      const htmlPath = await this.convertToHtml(filePath, baseName);
      const staticHtmlPath = await this.renderStaticHtml(htmlPath, baseName);
      const pdfPath = await this.generatePdf(staticHtmlPath, baseName);
      const zipPath = await this.createZip(staticHtmlPath, pdfPath, baseName);

      // Update job with generated files
      job.files = {
        html: path.relative(this.outputDir, staticHtmlPath),
        pdf: path.relative(this.outputDir, pdfPath),
        zip: path.relative(this.outputDir, zipPath),
      };
      job.status = 'processed';
      job.completedAt = new Date();

      this.emitJobUpdate(job);
    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.emitJobUpdate(job);
    }
  }

  private async convertToHtml(markdownPath: string, baseName: string): Promise<string> {
    const htmlPath = path.join(this.outputDir, 'html', `${baseName}.html`);
    
    return new Promise((resolve, reject) => {
      const pandocArgs = [
        markdownPath,
        '--from', 'gfm',
        '--to', 'html5',
        '--toc',
        '--toc-depth=3',
        '--standalone',
        '--template=templates/custom.html',
        '--output', htmlPath
      ];

      // Add CSS files
      const cssDir = path.join(process.cwd(), 'css');
      const cssFiles = ['minimal-style.css', 'tokyo-night-light.css'];
      
      cssFiles.forEach(cssFile => {
        const cssPath = path.join(cssDir, cssFile);
        pandocArgs.push('--css', cssPath);
      });

      const pandoc = spawn('pandoc', pandocArgs);

      let stderr = '';
      pandoc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pandoc.on('close', (code) => {
        if (code === 0) {
          resolve(htmlPath);
        } else {
          reject(new Error(`Pandoc failed: ${stderr}`));
        }
      });

      pandoc.on('error', (error) => {
        reject(new Error(`Failed to start pandoc: ${error.message}`));
      });
    });
  }

  private async renderStaticHtml(htmlPath: string, baseName: string): Promise<string> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
      
      // Execute any JavaScript that might be needed
      await page.evaluate(() => {
        // Wait for any dynamic content to load
        return new Promise<void>((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', () => resolve());
          }
        });
      });

      const staticHtmlPath = path.join(this.outputDir, 'html', `${baseName}_static.html`);
      const content = await page.content();
      await fs.writeFile(staticHtmlPath, content);

      return staticHtmlPath;
    } finally {
      await browser.close();
    }
  }

  private async generatePdf(htmlPath: string, baseName: string): Promise<string> {
    const pdfPath = path.join(this.outputDir, 'pdf', `${baseName}.pdf`);
    
    return new Promise((resolve, reject) => {
      const weasyArgs = [htmlPath, pdfPath];
      const weasy = spawn('weasyprint', weasyArgs);

      let stderr = '';
      weasy.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      weasy.on('close', (code) => {
        if (code === 0) {
          resolve(pdfPath);
        } else {
          reject(new Error(`WeasyPrint failed: ${stderr}`));
        }
      });

      weasy.on('error', (error) => {
        reject(new Error(`Failed to start weasyprint: ${error.message}`));
      });
    });
  }

  private async createZip(htmlPath: string, pdfPath: string, baseName: string): Promise<string> {
    const zipPath = path.join(this.outputDir, 'zip', `${baseName}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.file(htmlPath, { name: `${baseName}.html` });
      archive.file(pdfPath, { name: `${baseName}.pdf` });
      archive.finalize();
    });
  }

  private emitJobUpdate(job: ProcessingJob) {
    this.io.emit('job-update', job);
  }

  getJob(id: string): ProcessingJob | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getFileStream(jobId: string, fileType: 'html' | 'pdf' | 'zip'): Promise<{ stream: NodeJS.ReadableStream; filename: string } | null> {
    const job = this.jobs.get(jobId);
    if (!job || !job.files || !job.files[fileType]) {
      return null;
    }

    const filePath = path.join(this.outputDir, job.files[fileType]!);
    try {
      const stream = require('fs').createReadStream(filePath);
      const ext = path.extname(filePath);
      const baseName = path.parse(job.fileName).name;
      const filename = `${baseName}${ext}`;
      
      return { stream, filename };
    } catch (error) {
      return null;
    }
  }
}
