import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getJobForUser } from '../services/job.service';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response';
import { Job } from '../models/Job';

export const getJobStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!._id.toString();
    const job = await getJobForUser(jobId, userId);
    if (!job) {
      return res.status(404).json(errorResponse('Job not found', ERROR_CODES.NOT_FOUND));
    }
    return res.status(200).json(successResponse(
      {
        jobId: job.jobId,
        status: job.status,
        result: job.result ?? null,
        error: job.error ?? null,
      },
      'Job status retrieved'
    ));
  } catch (error: any) {
    return res.status(500).json(errorResponse(
      error.message || 'Error retrieving job status',
      ERROR_CODES.SERVER_ERROR
    ));
  }
};

export const streamJobStatus = async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!._id.toString();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const job = await getJobForUser(jobId, userId);

    if (!job) {
      send({ error: 'Job not found', status: 'failed' });
      return res.end();
    }

    if (job.status === 'completed' || job.status === 'failed') {
      const eagerNoteId = job.result?._id ?? job.result?.id ?? job.result?.noteId ?? null;
      send({
        jobId: job.jobId,
        status: job.status,
        result: job.result ?? null,
        error: job.error ?? null,
        _id: eagerNoteId,
        id: eagerNoteId,
        noteId: eagerNoteId,
      });
      return res.end();
    }

    const changeStream = Job.watch(
      [
        {
          $match: {
            operationType: 'update',
            'documentKey._id': job._id,
          },
        },
      ],
      { fullDocument: 'updateLookup' }
    );

    const heartbeat = setInterval(() => res.write(':\n\n'), 15000);

const cleanup = async () => {
  clearInterval(heartbeat);
  if (changeStream) {
    try {
      await changeStream.close();
    } catch (error) {
      // Safely extract the error message for TypeScript
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[Stream Cleanup] Failed to close change stream:", errorMessage);
    }
  }
};

req.on('close', cleanup);

    changeStream.on('change', (change: any) => {
      const doc = change.fullDocument;
      if (!doc) return;
      if (doc.status === 'completed' || doc.status === 'failed') {
        const streamNoteId = doc.result?._id ?? doc.result?.id ?? doc.result?.noteId ?? null;
        send({
          jobId: doc.jobId,
          status: doc.status,
          result: doc.result ?? null,
          error: doc.error ?? null,
          _id: streamNoteId,
          id: streamNoteId,
          noteId: streamNoteId,
        });
        cleanup();
        res.end();
      }
    });

    changeStream.on('error', () => {
      send({ error: 'Stream error', status: 'failed' });
      cleanup();
      res.end();
    });

  } catch (error: any) {
    send({ error: error.message || 'Server error', status: 'failed' });
    res.end();
  }
};
