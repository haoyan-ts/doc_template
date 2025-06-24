import express, { Request, Response, RequestHandler } from 'express';
import { DocumentService } from '../services/DocumentService';

export function downloadRouter(documentService: DocumentService) {
  const router = express.Router();

  router.get('/:jobId/:fileType', (async (req, res) => {
    try {
      const { jobId, fileType } = req.params;
      
      if (!['html', 'pdf', 'zip'].includes(fileType)) {
        return res.status(400).json({ error: 'Invalid file type' });
      }

      const fileData = await documentService.getFileStream(
        jobId,
        fileType as 'html' | 'pdf' | 'zip'
      );

      if (!fileData) {
        return res.status(404).json({ error: 'File not found' });
      }

      const { stream, filename } = fileData;

      // Set appropriate headers
      const mimeTypes = {
        html: 'text/html',
        pdf: 'application/pdf',
        zip: 'application/zip',
      };

      console.log(`Downloading file: ${filename} (${fileType})`);
      
      res.setHeader('Content-Type', mimeTypes[fileType as keyof typeof mimeTypes]);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURI(filename)}"`);

      stream.pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({
        error: 'Failed to download file',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }) as RequestHandler);

  return router;
}
