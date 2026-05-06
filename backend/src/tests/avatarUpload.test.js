import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPool, mockUploadStream } = vi.hoisted(() => ({
  mockPool: {
    query: vi.fn(),
  },
  mockUploadStream: vi.fn(),
}));

vi.mock('../config/db.js', () => ({ default: mockPool }));
vi.mock('../config/cloudinary.js', () => ({
  default: {
    uploader: {
      upload_stream: mockUploadStream,
    },
  },
}));
vi.mock('../middleware/auth.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', role: 'customer' };
    next();
  },
  requireAdmin: (_req, _res, next) => next(),
}));

const { default: uploadRouter } = await import('../routes/upload.js');

function createApp() {
  const app = express();
  app.use('/upload', uploadRouter);
  return app;
}

describe('avatar upload route', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
    mockUploadStream.mockReset();
    mockUploadStream.mockImplementation((options, callback) => ({
      end: () => callback(null, {
        secure_url: 'https://res.cloudinary.com/demo/avatar.jpg',
        public_id: options.public_id || 'ticketrush/avatars/user-1',
      }),
    }));
  });

  it('uploads an avatar, stores the URL, and returns the updated user', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-1',
          email: 'user@example.com',
          full_name: 'Ticket User',
          role: 'customer',
          avatar_url: 'https://res.cloudinary.com/demo/avatar.jpg',
        },
      ],
    });

    const response = await request(createApp())
      .post('/upload/avatar')
      .attach('image', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'avatar.jpg');

    expect(response.status).toBe(200);
    expect(response.body.user.avatar_url).toBe('https://res.cloudinary.com/demo/avatar.jpg');
    expect(mockUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'ticketrush/avatars',
        public_id: 'user-1',
        overwrite: true,
      }),
      expect.any(Function)
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE users SET avatar_url = \$2/i),
      ['user-1', 'https://res.cloudinary.com/demo/avatar.jpg']
    );
  });

  it('rejects non-image avatar uploads', async () => {
    const response = await request(createApp())
      .post('/upload/avatar')
      .attach('image', Buffer.from('plain text'), 'avatar.txt');

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/image/i);
    expect(mockUploadStream).not.toHaveBeenCalled();
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});
