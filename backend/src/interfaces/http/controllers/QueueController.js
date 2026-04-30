import { sendSuccess, sendCreated } from '../../../shared/response.js';
import { asyncHandler } from '../../../shared/asyncHandler.js';
import { ForbiddenError } from '../../../domain/errors/AppError.js';

export function makeQueueController(queueService) {
  return {
    enter: asyncHandler(async (req, res) => {
      const result = await queueService.enter(req.params.eventId, req.user.id);
      sendSuccess(res, result);
    }),

    status: asyncHandler(async (req, res) => {
      const result = await queueService.getStatus(req.params.eventId, req.user.id);
      sendSuccess(res, result);
    }),

    enable: asyncHandler(async (req, res) => {
      if (req.user.role !== 'admin') throw new ForbiddenError();
      await queueService.enable(req.params.eventId);
      sendSuccess(res, { ok: true });
    }),

    disable: asyncHandler(async (req, res) => {
      if (req.user.role !== 'admin') throw new ForbiddenError();
      await queueService.disable(req.params.eventId);
      sendSuccess(res, { ok: true });
    }),

    admit: asyncHandler(async (req, res) => {
      if (req.user.role !== 'admin') throw new ForbiddenError();
      const result = await queueService.admitBatch(req.params.eventId, req.body.batch_size);
      sendSuccess(res, result);
    }),
  };
}
