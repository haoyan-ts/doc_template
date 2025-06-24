import express, { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import { DocumentService } from "../services/DocumentService";

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/markdown" ||
      file.originalname.endsWith(".md")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Markdown files are allowed!"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function uploadRouter(documentService: DocumentService) {
  const router = express.Router();

  router.post("/", upload.single("markdown"), (async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const jobId = await documentService.processMarkdownFile(
        req.file.path,
        req.file.originalname
      );

      res.json({
        success: true,
        jobId,
        message: "File uploaded and processing started",
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        error: "Failed to process file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }) as RequestHandler);

  router.post("/multiple", upload.array("markdown", 10), (async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const jobIds = [];
      for (const file of req.files) {
        const jobId = await documentService.processMarkdownFile(
          file.path,
          file.originalname
        );
        jobIds.push(jobId);
      }

      res.json({
        success: true,
        jobIds,
        message: `${jobIds.length} files uploaded and processing started`,
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
