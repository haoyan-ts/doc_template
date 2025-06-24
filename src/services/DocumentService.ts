import { Server } from "socket.io";
import { spawn } from "child_process";
import puppeteer from "puppeteer";
import archiver from "archiver";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface ProcessingJob {
  id: string;
  fileName: string;
  originalName: string; // Original name of the file uploaded
  status: "uploaded" | "processing" | "processed" | "error";
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
  private uploadDir = path.join(process.cwd(), "uploads");
  private outputDir = path.join(process.cwd(), "output");

  constructor(io: Server) {
    this.io = io;
    this.initializeDirectories();
  }

  private async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, "html"), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, "pdf"), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, "zip"), { recursive: true });
    } catch (error) {
      console.error("Failed to create directories:", error);
    }
  }

  // Utility function to ensure proper filename encoding
  private sanitizeFilename(filename: string): string {
    // Ensure the filename is properly encoded as UTF-8
    // Remove any null bytes and normalize Unicode
    const sanitized = filename
      .replace(/\0/g, "") // Remove null bytes
      .normalize("NFC"); // Normalize Unicode to composed form

    return sanitized;
  }

  // Utility function to create safe file paths with UTF-8 support
  private createSafeFilePath(
    dir: string,
    filename: string,
    extension?: string
  ): string {
    const sanitizedName = this.sanitizeFilename(filename);
    const baseName = path.parse(sanitizedName).name;
    const ext = extension || path.parse(sanitizedName).ext;
    const safePath = path.join(dir, `${baseName}${ext}`);

    // Ensure the directory exists
    const directory = path.dirname(safePath);
    if (!require("fs").existsSync(directory)) {
      require("fs").mkdirSync(directory, { recursive: true });
    }

    return safePath;
  }
  async processMarkdownFile(
    filePath: string,
    fileName: string,
    originalName: string
  ): Promise<string> {
    const jobId = uuidv4();

    console.log(`Received file: ${fileName}`);
    console.log(`Processing file: ${decodeURIComponent(originalName)}`);
    console.log(`Job ID: ${jobId}`);

    const job: ProcessingJob = {
      id: jobId,
      fileName: fileName,
      originalName: decodeURIComponent(originalName),
      status: "uploaded",
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.emitJobUpdate(job);

    // Start processing asynchronously
    this.processFile(jobId, filePath).catch((error) => {
      console.error(`Processing failed for job ${jobId}:`, error);
      job.status = "error";
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
      job.status = "processing";
      this.emitJobUpdate(job);

      const baseName = path.parse(job.originalName).name;
      console.log(`Job ${jobId} completed successfully: ${baseName}`);

      const htmlPath = await this.convertToHtml(filePath, baseName);
      const staticHtmlPath = await this.renderStaticHtml(htmlPath, baseName);
      const pdfPath = await this.generatePdf(staticHtmlPath, baseName);
      const zipPath = await this.createZip(staticHtmlPath, pdfPath, baseName);

      console.log(`Generated files: ${htmlPath}, ${pdfPath}, ${zipPath}`);
      console.log(`Zip file created: ${zipPath}`);
      console.log(`Static HTML file created: ${staticHtmlPath}`);
      console.log(`PDF file created: ${pdfPath}`);
      console.log(`HTML file created: ${htmlPath}`);

      // Update job with generated files
      job.files = {
        html: path.relative(this.outputDir, staticHtmlPath),
        pdf: path.relative(this.outputDir, pdfPath),
        zip: path.relative(this.outputDir, zipPath),
      };
      job.status = "processed";
      job.completedAt = new Date();

      this.emitJobUpdate(job);
    } catch (error) {
      job.status = "error";
      job.error = error instanceof Error ? error.message : "Unknown error";
      this.emitJobUpdate(job);
    }
  }
  private async convertToHtml(
    markdownPath: string,
    baseName: string
  ): Promise<string> {
    const sanitizedBaseName = this.sanitizeFilename(baseName);
    const htmlPath = this.createSafeFilePath(
      path.join(this.outputDir, "html"),
      sanitizedBaseName,
      ".html"
    );

    return new Promise((resolve, reject) => {
      const pandocArgs = [
        markdownPath,
        "--from",
        "gfm",
        "--to",
        "html5",
        "--toc",
        "--toc-depth=3",
        "--standalone",
        "--template=templates/custom.html",
        "--output",
        htmlPath,
      ];

      // Add CSS files
      const cssDir = path.join(process.cwd(), "css");
      const cssFiles = ["minimal-style.css", "tokyo-night-light.css"];

      cssFiles.forEach((cssFile) => {
        const cssPath = path.join(cssDir, cssFile);
        pandocArgs.push("--css", cssPath);
      });

      const pandoc = spawn("pandoc", pandocArgs, {
        env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
      });

      let stderr = "";
      pandoc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString("utf8");
      });

      pandoc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve(htmlPath);
        } else {
          reject(new Error(`Pandoc failed: ${stderr}`));
        }
      });

      pandoc.on("error", (error: Error) => {
        reject(new Error(`Failed to start pandoc: ${error.message}`));
      });
    });
  }

  private async renderStaticHtml(
    htmlPath: string,
    baseName: string
  ): Promise<string> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });

      // Execute any JavaScript that might be needed
      await page.evaluate(() => {
        // Wait for any dynamic content to load
        return new Promise<void>((resolve) => {
          if (document.readyState === "complete") {
            resolve();
          } else {
            window.addEventListener("load", () => resolve());
          }
        });
      });

      const sanitizedBaseName = this.sanitizeFilename(baseName);
      const staticHtmlPath = this.createSafeFilePath(
        path.join(this.outputDir, "html"),
        sanitizedBaseName,
        "_static.html"
      );
      const content = await page.content();
      await fs.writeFile(staticHtmlPath, content, "utf8");

      return staticHtmlPath;
    } finally {
      await browser.close();
    }
  }
  private async generatePdf(
    htmlPath: string,
    baseName: string
  ): Promise<string> {
    const sanitizedBaseName = this.sanitizeFilename(baseName);
    const pdfPath = this.createSafeFilePath(
      path.join(this.outputDir, "pdf"),
      sanitizedBaseName,
      ".pdf"
    );
    const stylePath = path.join(process.cwd(), "css", "minimal-style.css");
    const codeStylePath = path.join(
      process.cwd(),
      "css",
      "tokyo-night-light.css"
    );

    return new Promise((resolve, reject) => {
      const weasyArgs = [
        htmlPath,
        pdfPath,
        "--stylesheet",
        stylePath,
        "--stylesheet",
        codeStylePath,
        "--base-url",
        path.dirname(htmlPath),
        "--pdf-variant",
        "pdf/ua-1", // PDF/UA-1 for better accessibility
        "--media-type",
        "print",
      ];

      const weasy = spawn("weasyprint", weasyArgs, {
        env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
      });

      let stderr = "";
      weasy.stderr.on("data", (data: Buffer) => {
        stderr += data.toString("utf8");
      });

      weasy.on("close", (code: number | null) => {
        if (code === 0) {
          resolve(pdfPath);
        } else {
          reject(new Error(`WeasyPrint failed: ${stderr}`));
        }
      });

      weasy.on("error", (error: Error) => {
        reject(new Error(`Failed to start weasyprint: ${error.message}`));
      });
    });
  }
  private async createZip(
    htmlPath: string,
    pdfPath: string,
    baseName: string
  ): Promise<string> {
    const sanitizedBaseName = this.sanitizeFilename(baseName);
    const zipPath = this.createSafeFilePath(
      path.join(this.outputDir, "zip"),
      sanitizedBaseName,
      ".zip"
    );

    return new Promise((resolve, reject) => {
      const output = require("fs").createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        resolve(zipPath);
      });

      archive.on("error", (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.file(htmlPath, { name: `${sanitizedBaseName}.html` });
      archive.file(pdfPath, { name: `${sanitizedBaseName}.pdf` });
      archive.finalize();
    });
  }

  private emitJobUpdate(job: ProcessingJob) {
    this.io.emit("job-update", job);
    console.log(`Job update emitted for job ID: ${job.id}, status: ${job.status}`);
  }

  getJob(id: string): ProcessingJob | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getFileStream(
    jobId: string,
    fileType: "html" | "pdf" | "zip"
  ): Promise<{ stream: NodeJS.ReadableStream; filename: string } | null> {
    const job = this.jobs.get(jobId);
    if (!job || !job.files || !job.files[fileType]) {
      return null;
    }

    const originalName = job.originalName;
    const filePath = path.join(this.outputDir, job.files[fileType]!);
    try {
      const stream = require("fs").createReadStream(filePath);
      const ext = path.extname(filePath);
      const baseName = path.parse(originalName).name;
      const filename = `${baseName}${ext}`;

      return { stream, filename };
    } catch (error) {
      return null;
    }
  }
}
