'use strict';

process.env.PORT = 0; // Use random ports

const request = require('supertest');
const ApiGateway = require('moleculer-web');
const { ServiceBroker } = require('moleculer');

function setup(brokerSettings = {}) {
  const broker = new ServiceBroker(Object.assign({}, { nodeID: undefined, logger: false }, brokerSettings));
  const service = broker.loadService('./services/home.service.js');

  const server = service.server;

  return [broker, service, server];
}
describe.only('Home service', () => {
  let broker;
  let service;
  let server;

  beforeAll(() => {
    const brokerSettings = require('../../moleculer.config');
    [ broker, service, server] = setup(brokerSettings);
    return broker.start();
  });

  afterAll(() => broker.stop());

  it('GET /', () => {
    return request(server)
      .get('/')
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(res.body).toHaveProperty('welcome', 'to sample API');
      });
  });
});