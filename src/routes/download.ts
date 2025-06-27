import express, { Request, Response, RequestHandler } from 'express';
import { DocumentService } from '../services/DocumentService';

export function downloadRouter(documentService: DocumentService) {
  const router = express.Router();

  router.get('/:jobId/:fileIdx/:fileType', (async (req, res) => {
    try {
      const { jobId, fileIdx: fileIdx, fileType } = req.params;
      
      if (!['pdf', 'zip'].includes(fileType)) {
        return res.status(400).json({ error: 'Invalid file type' });
      }

      console.debug(`Request to download file: jobId=${jobId}, fileIdx=${fileIdx}, fileType=${fileType}`);

      const fileData = await documentService.getFileStream(
        jobId,
        parseInt(fileIdx),
        fileType as 'pdf' | 'zip'
      );

      if (!fileData) {
        return res.status(404).json({ error: 'File not found' });
      }

      const { stream, filename } = fileData;

      // Set appropriate headers
      const mimeTypes = {
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
