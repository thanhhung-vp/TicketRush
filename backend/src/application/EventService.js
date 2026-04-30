import { EventRepository } from '../infrastructure/database/repositories/EventRepository.js';
import { NotFoundError, ValidationError } from '../domain/errors/AppError.js';
import { EVENT_STATUS } from '../domain/constants.js';

const eventRepo = new EventRepository();

export class EventService {
  async listPublic(filters) {
    return eventRepo.findAll(filters);
  }

  async listAdmin() {
    return eventRepo.findAllAdmin();
  }

  async getById(id) {
    const event = await eventRepo.findById(id);
    if (!event) throw new NotFoundError('Event');
    return event;
  }

  async getWithZones(id) {
    const event = await eventRepo.findByIdWithZones(id);
    if (!event) throw new NotFoundError('Event');
    return event;
  }

  async getSeats(eventId) {
    return eventRepo.findSeats(eventId);
  }

  async create(data, createdBy) {
    return eventRepo.create(data, createdBy);
  }

  async update(id, fields) {
    const event = await eventRepo.update(id, fields);
    if (!event) throw new NotFoundError('Event');
    return event;
  }

  async delete(id) {
    const deleted = await eventRepo.delete(id);
    if (!deleted) throw new ValidationError('Only draft events can be deleted');
  }

  async addZone(eventId, zoneData) {
    await this.getById(eventId); // ensure event exists
    const zone = await eventRepo.createZone(eventId, zoneData);
    const seatsCreated = await eventRepo.generateSeats(zone.id, eventId, zone.rows, zone.cols, zone.name);
    return { zone, seats_created: seatsCreated };
  }

  async removeZone(eventId, zoneId) {
    await eventRepo.deleteZone(zoneId, eventId);
  }
}
