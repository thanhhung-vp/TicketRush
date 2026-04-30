import { sendSuccess, sendCreated } from '../../../shared/response.js';
import { asyncHandler } from '../../../shared/asyncHandler.js';

export function makeOrderController(orderService) {
  return {
    myOrders: asyncHandler(async (req, res) => {
      const orders = await orderService.getMyOrders(req.user.id);
      sendSuccess(res, orders);
    }),

    getTickets: asyncHandler(async (req, res) => {
      const tickets = await orderService.getTickets(req.params.id, req.user.id);
      sendSuccess(res, tickets);
    }),

    checkout: asyncHandler(async (req, res) => {
      const result = await orderService.checkout(req.user.id, req.body.seat_ids);
      sendCreated(res, result);
    }),
  };
}
