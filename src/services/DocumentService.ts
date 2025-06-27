import { Server } from "socket.io";
import { spawn } from "child_process";
import puppeteer from "puppeteer";
import archiver from "archiver";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Multer } from "multer";
import { Express } from "express";

export interface ProcessingJob {
  id: string;
  fileName?: string;
  originalName?: string; // Original name of the file uploaded
  status: "uploaded" | "processing" | "processed" | "error";
  createdAt: Date;
  completedAt?: Date;
  files?: {
    basename: string;
    html?: string;
    pdf?: string;
    zip?: string;
  }[];
  error?: string;
  progress?: number; // Optional progress percentage
}

export class DocumentService {
  private jobs: Map<string, ProcessingJob> = new Map();
  private io: Server;
  private uploadDir = path.join(process.cwd(), "uploads");
  private jobsDir = path.join(process.cwd(), "jobs");
  private outputDir = path.join(process.cwd(), "output");

  constructor(io: Server) {
    this.io = io;
    this.initializeDirectories();
  }

  private async initializeDirectories() {
    // Remove all existing directories to ensure a clean start
    try {
      await fs.rm(this.uploadDir, { recursive: true, force: true });
      await fs.rm(this.outputDir, { recursive: true, force: true });
      await fs.rm(this.jobsDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to remove existing directories:", error);
    }

    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.jobsDir, { recursive: true });
      // await fs.mkdir(path.join(this.outputDir, "html"), { recursive: true });
      // await fs.mkdir(path.join(this.outputDir, "pdf"), { recursive: true });
      // await fs.mkdir(path.join(this.outputDir, "zip"), { recursive: true });
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
  // async processMarkdownFile(
  //   filePath: string,
  //   fileName: string,
  //   originalName: string
  // ): Promise<string> {
  //   const jobId = uuidv4();

  //   console.log(`Received file: ${fileName}`);
  //   console.log(`Processing file: ${decodeURIComponent(originalName)}`);
  //   console.log(`Job ID: ${jobId}`);

  //   // Create job folder and move file
  //   const jobFolder = path.join(this.uploadDir, jobId);
  //   await fs.mkdir(jobFolder, { recursive: true });

  //   const destPath = path.join(jobFolder, originalName);
  //   await fs.copyFile(filePath, destPath);

  //   const job: ProcessingJob = {
  //     id: jobId,
  //     fileName: fileName,
  //     originalName: decodeURIComponent(originalName),
  //     status: "uploaded",
  //     createdAt: new Date(),
  //   };

  //   this.jobs.set(jobId, job);
  //   this.emitJobUpdate(job);

  //   // Start processing asynchronously using self-contained method
  //   this.processBatchFile(jobId, destPath).catch((error) => {
  //     console.error(`Processing failed for job ${jobId}:`, error);
  //     job.status = "error";
  //     job.error = error.message;
  //     this.emitJobUpdate(job);
  //   });

  //   return jobId;
  // }

  private async generatePdfFromHtml(
    jobId: string,
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
      const pdfPath = this.createSafeFilePath(
        path.join(this.outputDir, jobId, "pdf"),
        sanitizedBaseName,
        ".pdf"
      );
      // const content = await page.content();
      // await fs.writeFile(staticHtmlPath, content, "utf8");
      await page.pdf({
        path: pdfPath,
      });

      return pdfPath;
    } finally {
      await browser.close();
    }
  }
  private async generatePdf(
    jobId: string,
    htmlPath: string,
    baseName: string
  ): Promise<string> {
    const sanitizedBaseName = this.sanitizeFilename(baseName);
    const pdfPath = this.createSafeFilePath(
      path.join(this.outputDir, jobId, "pdf"),
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
    jobId: string,
    baseName: string
  ): Promise<string> {
    const sanitizedBaseName = this.sanitizeFilename(baseName);
    const zipPath = this.createSafeFilePath(
      path.join(this.outputDir, jobId, "zip"),
      sanitizedBaseName,
      ".zip"
    );

    return new Promise((resolve, reject) => {
      const output = fsSync.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        resolve(zipPath);
      });

      archive.on("error", (err) => {
        reject(err);
      });

      archive.pipe(output);
      
      // Add HTML directory contents to the zip
      const htmlDir = path.join(this.outputDir, jobId, "html");
      if (fsSync.existsSync(htmlDir)) {
        archive.directory(htmlDir, "html");
      }

      // Add PDF directory contents to the zip
      const pdfDir = path.join(this.outputDir, jobId, "pdf");
      if (fsSync.existsSync(pdfDir)) {
        archive.directory(pdfDir, "pdf");
      }

      archive.finalize();
    });
  }

  private emitJobUpdate(job: ProcessingJob) {
    this.io.emit("job-update", job);
    console.log(
      `Job update emitted for job ID: ${job.id}, status: ${job.status}`
    );
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
    fileIdx: number,
    fileType: "pdf" | "zip"
  ): Promise<{ stream: NodeJS.ReadableStream; filename: string } | null> {
    const job = this.jobs.get(jobId);

    if (!job || !job.files) {
      console.error(`Job with ID ${jobId} not found or has no files.`);
      return null;
    }

    const file = job.files[fileIdx];

    if (!file || !file[fileType]) {
      console.error(
        `File with ID ${fileIdx} and type ${fileType} not found in job ${jobId}.`
      );
      return null;
    }

    const filePath = path.join(this.outputDir, file[fileType]);
    console.log(`File path: ${filePath}`);

    try {
      const stream = fsSync.createReadStream(filePath);
      const filename = path.basename(filePath);

      return { stream, filename };
    } catch (error) {
      return null;
    }
  }

  async processMarkdownBatch(
    markdownFiles: Express.Multer.File[],
    mediaFiles: Express.Multer.File[],
    jobId: string
  ): Promise<{ jobId: string }> {
    console.log(`Processing batch with Job ID: ${jobId}`);
    console.log(`Has Markdown file and ${mediaFiles.length} media files`);

    // Copy all files to job folder and reconstruct the file structure
    const jobFolder = path.join(this.jobsDir, jobId);
    await fs.mkdir(jobFolder, { recursive: true });
    console.log(`Job folder created: ${jobFolder}`);

    for (const file of markdownFiles) {
      const originalPath = decodeURIComponent(file.originalname);
      console.log(`Original path: ${originalPath}`);
      const pathParts = originalPath.split("/");
      // Remove the first directory if there are multiple directory levels
      const adjustedPath =
        pathParts.length > 1 ? pathParts.slice(1).join("/") : originalPath;
      const destPath = path.join(jobFolder, adjustedPath);

      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(file.path, destPath);
    }

    for (const file of mediaFiles) {
      const originalPath = decodeURIComponent(file.originalname);
      console.log(`Media file path: ${originalPath}`);
      const pathParts = originalPath.split("/");
      // Remove the first directory if there are multiple directory levels
      const adjustedPath =
        pathParts.length > 1 ? pathParts.slice(1).join("/") : originalPath;
      const destPath = path.join(jobFolder, adjustedPath);

      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(file.path, destPath);
    }

    const job: ProcessingJob = {
      id: jobId,
      status: "uploaded",
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.emitJobUpdate(job);

    // Start processing asynchronously
    this.processBatchFile(jobId).catch((error) => {
      console.error(`Processing failed for job ${jobId}:`, error);
      job.status = "error";
      job.error = error.message;
      this.emitJobUpdate(job);
    });

    return { jobId };
  }

  private async processBatchFile(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Update status to processing
      job.status = "processing";
      this.emitJobUpdate(job);

      // find all markdown files in the job folder according to the jobId
      const jobFolder = path.join(this.jobsDir, jobId);
      const files = await fs.readdir(jobFolder);
      const markdownFiles = files.filter((file) => file.endsWith(".md"));

      for (const file of markdownFiles) {
        const filePath = path.join(jobFolder, file);
        const baseName = path.parse(file).name;

        console.log(
          `Processing file: "${filePath}" with base name: "${baseName}"`
        );
        const htmlPath = await this.generateHtmlFromMarkdown(
          jobId,
          filePath,
          baseName
        );
        this.emitJobUpdate({
          ...job,
          status: "processing",
          progress:
            ((1 / 2) * (markdownFiles.indexOf(file) + 1)) /
            markdownFiles.length,
        });
        const pdfPath = await this.generatePdfFromHtml(
          jobId,
          htmlPath,
          baseName
        );

        const zipPath = await this.createZip(
          jobId,
          htmlPath,
        );

        
        this.emitJobUpdate({
          ...job,
          status: "processing",
          progress: (markdownFiles.indexOf(file) + 1) / markdownFiles.length,
        });
        
        // emulate a progress update
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log(
          `Generated files: ${htmlPath}, ${pdfPath}, ${zipPath}`
        );
        // Update job with generated files
        if (!job.files) {
          job.files = [];
        }

        job.files.push({
          basename: baseName,
          // html: path.relative(this.outputDir, htmlPath),
          pdf: path.relative(this.outputDir, pdfPath),
          zip: path.relative(this.outputDir, zipPath),
        });
      }

      job.status = "processed";
      job.completedAt = new Date();

      this.emitJobUpdate(job);
    } catch (error) {
      job.status = "error";
      job.error = error instanceof Error ? error.message : "Unknown error";
      this.emitJobUpdate(job);
    }
  }

  private async generateHtmlFromMarkdown(
    jobId: string,
    markdownPath: string,
    baseName: string
  ): Promise<string> {
    const sanitizedBaseName = this.sanitizeFilename(baseName);
    const htmlPath = this.createSafeFilePath(
      path.join(this.outputDir, jobId, "html"),
      sanitizedBaseName,
      ".html"
    );

    const htmlDir = path.join(this.outputDir, jobId, "html");

    return new Promise(async (resolve, reject) => {
      const pandocArgs = [
        markdownPath,
        "--from",
        "gfm",
        "--to",
        "html5",
        "--toc",
        "--toc-depth=3",
        "--standalone",
        "--template=../../../templates/custom.html",
        "--output",
        htmlPath,
        "--extract-media", // Extract and save media files
        htmlDir, // Path to save media files
      ];

      // Add CSS stylesheets if they exist
      const resourceDir = path.join(process.cwd(), "css");
      const resourceFiles = await fs.readdir(resourceDir);

      await fs.mkdir(path.join(htmlDir, "css"), { recursive: true });

      // Copy all resource files to the css folder under the job folder
      resourceFiles.forEach(async (files) => {
        await fs.copyFile(
          path.join(resourceDir, files),
          path.join(htmlDir, "css", files)
        );
      });
      
      for (const cssFile of resourceFiles.filter((file) => file.endsWith(".css"))) {
        // Add the CSS file relative paths to pandoc arguments according to the job folder
        pandocArgs.push("--css");
        // Use relative path to the job folder
        pandocArgs.push(
          path.join("css", cssFile).replace(/\\/g, "/") // Ensure forward slashes for pandoc
        );
      }

      console.debug(`Running pandoc with args: ${pandocArgs.join(" ")}`);
      console.debug(`Working directory: ${htmlDir}`);

      // Set the working directory to the job folder so relative paths work
      const pandoc = spawn("pandoc", pandocArgs, {
        cwd: htmlDir,
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
}
