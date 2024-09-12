import mongoose from 'mongoose';
import app from '../src/app';
import request from 'supertest';

afterAll(async () => { 
  await new Promise(resolve => setTimeout(resolve, 1000));
  await mongoose.disconnect();
});

describe('Testing app [REST] ', () => {
  test('APP_SUITE - Should return success on a health check request', async () => {
    const req = await request(app)
      .get('/check')
      .expect(200);

    expect(req.statusCode).toBe(200);
    expect(req.body.status).toEqual('UP');
  });

  test('APP_SUITE - Should return success on a health check request with details', async () => {
    const req = await request(app)
      .get('/check?details=1')
      .expect(200);

    expect(req.statusCode).toBe(200);
    expect(req.body.status).toEqual('UP');
    expect(req.body.attributes).toBeDefined();
  });

  test('APP_SUITE - Should return 404 - Operation not found', async () => {
    const req = await request(app)
      .get('/not-found')
      .expect(404);

    expect(req.statusCode).toBe(404);
  });
});
