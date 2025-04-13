import mongoose from 'mongoose';
import request from 'supertest';

let app = null;

afterAll(async () => { 
  await new Promise(resolve => setTimeout(resolve, 1000));
  await mongoose.disconnect();
});

beforeAll(async () => {
  process.env.MAX_REQUEST_PER_MINUTE = 1;
  app = (await import('../../../src/app')).default;
});

describe('When maximum request per minute is postive', () => {
  test('LIMITER_SUITE - Should return 429 - Too many requests', async () => {
    await request(app)
      .get('/check')
      .expect(200);

    const req = await request(app)
      .get('/check')
      .expect(429);

    expect(req.statusCode).toBe(429);
    expect(req.body.error).toEqual('API request per minute quota exceeded');
  });
});