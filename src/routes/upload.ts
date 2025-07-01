import express, { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { DocumentService } from "../services/DocumentService";

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    // Allow markdown files and common media files
    if (
      file.mimetype === "text/markdown" ||
      file.originalname.endsWith(".md") ||
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("audio/") ||
      file.originalname.match(
        /\.(png|jpg|jpeg|gif|svg|webp|pdf|doc|docx|txt)$/i
      )
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Markdown files and media files are allowed!"));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  preservePath: false, // Preserve folder structure
});

export function uploadRouter(documentService: DocumentService) {
  const router = express.Router();
  // router.post("/", upload.single("files"), (async (req, res) => {
  //   try {
  //     if (!req.file) {
  //       return res.status(400).json({ error: "No file uploaded" });
  //     }

  //     const jobId = await documentService.processMarkdownFile(
  //       req.file.path,
  //       req.file.filename,
  //       req.file.originalname
  //     );

  //     res.json({
  //       success: true,
  //       jobId,
  //       message: "File uploaded and processing started",
  //     });
  //   } catch (error) {
  //     console.error("Upload error:", error);
  //     res.status(500).json({
  //       error: "Failed to process file",
  //       message: error instanceof Error ? error.message : "Unknown error",
  //     });
  //   }
  // }) as RequestHandler);

  // Handle a folder upload
  router.post("/folder", upload.array("files", 50), (async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Generate a single jobId for all files in this upload batch
      const jobId = randomUUID();

      // Check if there is a single Markdown file in the upload
      const markdownFiles = req.files.filter(
        (file) =>
          file.originalname.endsWith(".md") || file.mimetype === "text/markdown"
      );
      
      if (markdownFiles.length === 0) {
        return res
        .status(400)
        .json({ error: "At least one Markdown file is required" });
      }
      else if (markdownFiles.length > 1) {
        return res
        .status(400)
        .json({ error: "Only one Markdown file is allowed in a folder upload" });
      }

      // Group other files as media files      
      const mediaFiles = req.files.filter(
        (file) =>
          !file.originalname.endsWith(".md") &&
          file.mimetype !== "text/markdown"
      );

      // Process the upload batch with the jobId
      const result = await documentService.processMarkdownBatch(
        markdownFiles,
        mediaFiles,
        jobId
      );

      res.json({
        success: true,
        jobId: result.jobId,
        message: `${req.files.length} files uploaded and processing started`,
      });
    } catch (error) {
      console.error("Folder upload error:", error);
      res.status(500).json({
        error: "Failed to process files",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }) as RequestHandler);    

  // Handle multiple file uploads
  router.post("/multiple", upload.array("files", 50), (async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      // Generate a single jobId for all files in this upload batch
      const jobId = randomUUID();

      // Group files by type
      const markdownFiles = req.files.filter(
        (file) =>
          file.originalname.endsWith(".md") || file.mimetype === "text/markdown"
      );
      const mediaFiles = req.files.filter(
        (file) =>
          !file.originalname.endsWith(".md") &&
          file.mimetype !== "text/markdown"
      );

      if (markdownFiles.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one Markdown file is required" });
      }

      // Process the upload batch with the jobId
      const result = await documentService.processMarkdownBatch(
        markdownFiles,
        mediaFiles,
        jobId
      );

      res.json({
        success: true,
        jobId: result.jobId,
        message: `${req.files.length} files uploaded and processing started`,
      });
    } catch (error) {
      console.error("Multiple upload error:", error);
      res.status(500).json({
        error: "Failed to process files",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }) as RequestHandler);

  return router;
}
