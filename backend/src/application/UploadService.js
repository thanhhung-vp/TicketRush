import { CloudinaryStorage } from '../infrastructure/storage/CloudinaryStorage.js';

const storage = new CloudinaryStorage();

export class UploadService {
  async uploadImage(buffer) {
    if (!buffer) throw new Error('No file provided');
    return storage.uploadBuffer(buffer, 'ticketrush/events');
  }
}
