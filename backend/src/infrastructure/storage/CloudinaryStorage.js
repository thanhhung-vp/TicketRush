import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../config/index.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key:    config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure:     true,
});

export class CloudinaryStorage {
  async uploadBuffer(buffer, folder = 'ticketrush/events') {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
      );
      stream.end(buffer);
    });
  }
}
