import { EventService } from '../../../application/EventService.js';
import { createEventSchema, zoneSchema } from '../validators/event.validators.js';
import { sendSuccess, sendCreated } from '../../../shared/response.js';
import { asyncHandler } from '../../../shared/asyncHandler.js';
import { ValidationError } from '../../../domain/errors/AppError.js';

const eventService = new EventService();

function validate(schema, body) {
  const r = schema.safeParse(body);
  if (!r.success) throw new ValidationError('Validation failed', r.error.flatten());
  return r.data;
}

export const EventController = {
  list: asyncHandler(async (req, res) => {
    const events = await eventService.listPublic(req.query);
    sendSuccess(res, events);
  }),

  getOne: asyncHandler(async (req, res) => {
    const event = await eventService.getWithZones(req.params.id);
    sendSuccess(res, event);
  }),

  getSeats: asyncHandler(async (req, res) => {
    const seats = await eventService.getSeats(req.params.id);
    sendSuccess(res, seats);
  }),

  create: asyncHandler(async (req, res) => {
    const data = validate(createEventSchema, req.body);
    const event = await eventService.create(data, req.user.id);
    sendCreated(res, event);
  }),

  update: asyncHandler(async (req, res) => {
    const event = await eventService.update(req.params.id, req.body);
    sendSuccess(res, event);
  }),

  remove: asyncHandler(async (req, res) => {
    await eventService.delete(req.params.id);
    sendSuccess(res, { ok: true });
  }),

  addZone: asyncHandler(async (req, res) => {
    const data = validate(zoneSchema, req.body);
    const result = await eventService.addZone(req.params.id, data);
    sendCreated(res, result);
  }),

  removeZone: asyncHandler(async (req, res) => {
    await eventService.removeZone(req.params.id, req.params.zoneId);
    sendSuccess(res, { ok: true });
  }),
};
