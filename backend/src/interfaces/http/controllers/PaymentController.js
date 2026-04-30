import { sendSuccess, sendCreated } from '../../../shared/response.js';
import { asyncHandler } from '../../../shared/asyncHandler.js';
import { ValidationError } from '../../../domain/errors/AppError.js';
import { initiateSchema, confirmSchema } from '../validators/payment.validators.js';

function validate(schema, body) {
  const r = schema.safeParse(body);
  if (!r.success) throw new ValidationError('Validation failed', r.error.flatten());
  return r.data;
}

export function makePaymentController(paymentService) {
  return {
    initiate: asyncHandler(async (req, res) => {
      const { seat_ids, method } = validate(initiateSchema, req.body);
      const result = await paymentService.initiate(req.user.id, seat_ids, method);
      sendCreated(res, result);
    }),

    confirm: asyncHandler(async (req, res) => {
      const { order_id, method } = validate(confirmSchema, req.body);
      const result = await paymentService.confirm(req.user.id, order_id, method, req.body);
      sendSuccess(res, result);
    }),

    cancel: asyncHandler(async (req, res) => {
      await paymentService.cancel(req.user.id, req.body.order_id);
      sendSuccess(res, { ok: true });
    }),

    vnpayIpn: (req, res) => {
      const { vnp_ResponseCode } = req.body;
      res.json(vnp_ResponseCode === '00'
        ? { RspCode: '00', Message: 'Confirm Success' }
        : { RspCode: '01', Message: 'Order Not Found' });
    },

    momoIpn: (req, res) => {
      res.json(req.body.resultCode === 0
        ? { status: 200, message: 'Success' }
        : { status: 400, message: 'Failed' });
    },
  };
}
