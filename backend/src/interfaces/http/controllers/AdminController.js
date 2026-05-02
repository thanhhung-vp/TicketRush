import { AdminService } from '../../../application/AdminService.js';
import { sendSuccess } from '../../../shared/response.js';
import { asyncHandler } from '../../../shared/asyncHandler.js';

const adminService = new AdminService();

export const AdminController = {
  events:       asyncHandler(async (req, res) => sendSuccess(res, await adminService.getAllEvents())),
  dashboard:    asyncHandler(async (req, res) => sendSuccess(res, await adminService.getDashboard())),
  audience:     asyncHandler(async (req, res) => sendSuccess(res, await adminService.getAudienceStats())),
  eventSeats:   asyncHandler(async (req, res) => sendSuccess(res, await adminService.getEventSeats(req.params.id))),
};
