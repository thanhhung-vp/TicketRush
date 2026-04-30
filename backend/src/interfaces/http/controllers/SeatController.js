import { sendSuccess } from '../../../shared/response.js';
import { asyncHandler } from '../../../shared/asyncHandler.js';

export function makeSeatController(seatService) {
  return {
    hold: asyncHandler(async (req, res) => {
      const result = await seatService.hold(req.user.id, req.body.seat_ids);
      sendSuccess(res, result);
    }),

    release: asyncHandler(async (req, res) => {
      await seatService.release(req.user.id, req.body.seat_ids);
      sendSuccess(res, { ok: true });
    }),
  };
}
