import express from 'express';
import { DocumentService } from '../services/DocumentService';

export function filesRouter(documentService: DocumentService) {
  const router = express.Router();

  // Get all jobs
  router.get('/', (req, res) => {
    try {
      const jobs = documentService.getAllJobs();
      res.json({ jobs });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({
        error: 'Failed to fetch jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get specific job details
  router.get('/:jobId', ((req, res) => {
    try {
      const { jobId } = req.params;
      const job = documentService.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({ job });
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({
        error: 'Failed to fetch job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }) as express.RequestHandler);

  // Delete specific job
  router.delete('/:jobId', (async (req, res) => {
    try {
      const { jobId } = req.params;
      const deleted = await documentService.deleteJob(jobId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({ message: 'Job deleted successfully', jobId });
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({
        error: 'Failed to delete job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }) as express.RequestHandler);

  return router;
}
