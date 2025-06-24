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
  preservePath: false,
  // Ensure proper filename handling
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      // Generate a unique filename while preserving the original name
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(Buffer.from(file.originalname, 'latin1').toString('utf8'));
      const baseName = path.basename(Buffer.from(file.originalname, 'latin1').toString('utf8'), ext);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  })
});

export function uploadRouter(documentService: DocumentService) {
  const router = express.Router();

  // router.post("/", upload.single("markdown"), (async (req, res) => {
  //   try {
  //     if (!req.file) {
  //       return res.status(400).json({ error: "No file uploaded" });
  //     }

  //     const jobId = await documentService.processMarkdownFile(
  //       req.file.path,
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

  router.post("/multiple", upload.array("markdown", 10), (async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const jobIds = [];
      for (const file of req.files) {
        if (!file || !file.path || !file.filename) {
          return res.status(400).json({ error: "Invalid file data" });
        }

        const jobId = await documentService.processMarkdownFile(
          file.path,
          file.filename,
          file.originalname
        );
        console.log(`File ${decodeURIComponent(file.originalname)} processed with job ID: ${jobId}`);
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
