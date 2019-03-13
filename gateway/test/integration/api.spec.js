'use strict';

process.env.PORT = 0; // Use random ports

const request = require('supertest');
const ApiGateway = require('moleculer-web');
const { ServiceBroker } = require('moleculer');

function setup(settings, brokerSettings = {}) {
  const broker = new ServiceBroker(Object.assign({}, { nodeID: undefined, logger: false }, brokerSettings));
  const service = broker.loadService('./services/api.service.js');
  const server = service.server;

  return [broker, service, server];
}
describe('API service', () => {
  let broker;
  let service;
  let server;

  beforeAll(() => {
    [ broker, service, server] = setup();
    return broker.start();
  });

  afterAll(() => broker.stop());

  it('GET open API definition', () => {
    return request(server)
      .get('/api/v1/doc/openapi.json')
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body).toHaveProperty('openapi', '3.0.1');
      });
  });
  it('GET /users with Basic Authorization', () => {
    // fake users.list action
    const mockService = broker.createService({
      name: 'users',
      actions: {
        list: {
          auth: true,
          handler: jest.fn(() => Promise.resolve({
            users: []
          })),
        }
      }
    });
    return request(server)
      .get('/api/v1/users')
      .set('Authorization', 'Basic 123456')
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body).toHaveProperty('users', []);
        return broker.destroyService(mockService);
      });
  });
  it('GET /users with Token Authorization', () => {
    // fake users.list action
    const mockService = broker.createService({
      name: 'users',
      actions: {
        list: {
          handler: jest.fn(() => Promise.resolve({
            users: []
          })),
        },
        resolveToken: {
          handler: jest.fn(() => Promise.resolve({
            _id: 'mockUser._id',
            username: 'mockUser.username',
            email: 'mockUser.email',
            image: 'mockUser.image',
          })),
        }
      }
    });
    return request(server)
      .get('/api/v1/users')
      .set('Authorization', 'Token 654321')
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body).toHaveProperty('users', []);
        return broker.destroyService(mockService);
      });
  });
  it('GET /users with Invalid Bearer Authorization', () => {
    // fake users.list action
    const mockService = broker.createService({
      name: 'users',
      actions: {
        list: {
          handler: jest.fn(() => Promise.resolve({
            users: []
          })),
        },
        resolveToken: {
          handler: jest.fn(() => Promise.resolve(undefined)),
        }
      }
    });
    return request(server)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer 654321')
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body).toHaveProperty('users', []);
        return broker.destroyService(mockService);
      });
  });
});