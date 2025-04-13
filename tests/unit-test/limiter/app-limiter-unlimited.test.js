import mongoose from 'mongoose';
import request from 'supertest';

let app = null;

afterAll(async () => { 
  await new Promise(resolve => setTimeout(resolve, 1000));
  await mongoose.disconnect();
});

beforeAll(async () => {
  process.env.MAX_REQUEST_PER_MINUTE = 0;
  app = (await import('../../../src/app')).default;
});

describe('When maximum request per minute is zero (unlimited)', () => {
  test('LIMITER_SUITE - Should return 200 - OK', async () => {
    await request(app)
      .get('/check')
      .expect(200);
  });
});