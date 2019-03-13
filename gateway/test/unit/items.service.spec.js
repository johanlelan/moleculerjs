'use strict';

const { ServiceBroker } = require('moleculer');
const TestService = require('../../services/items.service');

describe('Test \'Items\' service', () => {
  let broker = new ServiceBroker({
    logger: false,
  });
  broker.createService(TestService);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  it('should create an item', async (done) => {
    const item = { title: 'an item' };
    const cb = jest.fn(() => Promise.resolve({
      _id: 'mock-item',
    }));
    const FakeService = broker.createService({
      name: 'entity',
      actions: {
        create: {
          handler: cb,
        }
      }
    });
    expect(FakeService).toBeDefined();
    return FakeService._start()
      .then(async () => {
        const result = await broker.call('items.create', item);
        expect(result).toHaveProperty('_id');
      }).then(() => {
        const spec = FakeService._serviceSpecification;
        expect(spec.actions['entity.create']).toBeDefined();
        expect(cb).toHaveBeenCalledTimes(1);
        const calls = cb.mock.calls;
        expect(calls).toHaveLength(1);
        const eventArgs = cb.mock.calls[0];
        expect(eventArgs).toHaveLength(1);
        expect(eventArgs[0]).toBeInstanceOf(Object);
        expect(eventArgs[0]).toHaveProperty('params');
        expect(eventArgs[0].params).toHaveProperty('title', item.title);
        expect(spec.events).toEqual({});
        // stop FakeService
        broker.destroyService(FakeService).then(done);
      });
  });
  it('should list all item', async (done) => {
    const query = {};
    const cb = jest.fn(() => Promise.resolve({
      _type: 'items',
      total: 4,
      data: [{}, {}, {}, {}],
    }));
    const FakeService = broker.createService({
      name: 'search',
      actions: {
        list: {
          handler: cb,
        }
      }
    });
    expect(FakeService).toBeDefined();
    return FakeService._start()
      .then(async () => {
        const result = await broker.call('items.list', query);
        expect(result).toBeInstanceOf(Object);
        expect(result).toHaveProperty('_type', 'items');
        expect(result).toHaveProperty('total', 4);
        expect(result).toHaveProperty('data');
        expect(result.data).toBeInstanceOf(Array);
        expect(result.data).toHaveLength(4);
      }).then(() => {
        const spec = FakeService._serviceSpecification;
        expect(spec.actions['search.list']).toBeDefined();
        expect(cb).toHaveBeenCalledTimes(1);
        const calls = cb.mock.calls;
        expect(calls).toHaveLength(1);
        const eventArgs = cb.mock.calls[0];
        expect(eventArgs).toHaveLength(1);
        expect(eventArgs[0]).toBeInstanceOf(Object);
        expect(eventArgs[0]).toHaveProperty('params');
        expect(eventArgs[0].params).toEqual({...query, type: 'items'});
        expect(spec.events).toEqual({});
        // stop FakeService
        broker.destroyService(FakeService).then(done);
      });
  });
  it('should remove an item', async (done) => {
    const params = { id: 'itemId' };
    const cb = jest.fn();
    const FakeService = broker.createService({
      name: 'entity',
      actions: {
        remove: {
          handler: cb,
        }
      }
    });
    expect(FakeService).toBeDefined();
    return FakeService._start()
      .then(async () => {
        const result = await broker.call('items.remove', params);
        expect(result).toBeUndefined();
      }).then(() => {
        const spec = FakeService._serviceSpecification;
        expect(spec.actions['entity.remove']).toBeDefined();
        expect(cb).toHaveBeenCalledTimes(1);
        const calls = cb.mock.calls;
        expect(calls).toHaveLength(1);
        const eventArgs = cb.mock.calls[0];
        expect(eventArgs).toHaveLength(1);
        expect(eventArgs[0]).toBeInstanceOf(Object);
        expect(eventArgs[0]).toHaveProperty('params');
        expect(eventArgs[0].params).toEqual(params);
        expect(spec.events).toEqual({});
        // stop FakeService
        broker.destroyService(FakeService).then(done);
      });
  });
  describe('Get action behavior', () => {
    it('should get an item', async (done) => {
      const query = {
        id: 'testGet',
      };
      const cb = jest.fn(() => Promise.resolve({
        _type: 'items',
        _active: true,
        title: 'TestGet title',
      }));
      const FakeService = broker.createService({
        name: 'search',
        actions: {
          get: {
            handler: cb,
          }
        }
      });
      expect(FakeService).toBeDefined();
      return FakeService._start()
        .then(async () => {
          const result = await broker.call('items.get', query);
          expect(result).toBeInstanceOf(Object);
          expect(result).toHaveProperty('_type', 'items');
          expect(result).toHaveProperty('_active', true);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.actions['search.get']).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(1);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty('params');
          expect(eventArgs[0].params).toEqual({...query, type: 'items'});
          expect(spec.events).toEqual({});
          // stop FakeService
          broker.destroyService(FakeService).then(done);
        });
    });
    it('should manage unknown item', async (done) => {
      const query = {
        id: 'test404',
      };
      const cb = jest.fn(() => Promise.resolve(undefined));
      const FakeSearchService = broker.createService({
        name: 'search',
        actions: {
          get: {
            handler: cb,
          }
        }
      });
      const cb1 = jest.fn(() => Promise.resolve(undefined));
      const FakeEventStoreService = broker.createService({
        name: 'event-store',
        actions: {
          getAllEvents: {
            handler: cb1,
          }
        }
      });
      expect(FakeSearchService).toBeDefined();
      expect(FakeEventStoreService).toBeDefined();
      return FakeSearchService._start()
        .then(FakeEventStoreService._start())
        .then(async () => {
          const result = await broker.call('items.get', query);
          expect(result).toBeUndefined();
        }).then(() => {
          const spec = FakeSearchService._serviceSpecification;
          expect(spec.actions['search.get']).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(1);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty('params');
          expect(eventArgs[0].params).toEqual({...query, type: 'items'});
          expect(spec.events).toEqual({});
          // stop FakeSearchService
          return broker.destroyService(FakeSearchService);
        }).then(() => {
          const spec = FakeEventStoreService._serviceSpecification;
          expect(spec.actions['event-store.getAllEvents']).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(1);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty('params');
          expect(eventArgs[0].params).toEqual({...query, type: 'items'});
          expect(spec.events).toEqual({});
          // stop FakeService
          broker.destroyService(FakeEventStoreService).then(done);
        });
    });
    it('should manage disabled item', async (done) => {
      const query = {
        id: 'testDisable',
      };
      const cb = jest.fn(() => Promise.resolve({
        _active: false,
        _type: 'items',
        title: 'disabled item',
      }));
      const FakeService = broker.createService({
        name: 'search',
        actions: {
          get: {
            handler: cb,
          }
        }
      });
      expect(FakeService).toBeDefined();
      return FakeService._start()
        .then(async () => {
          const result = await broker.call('items.get', query);
          expect(result).toBeInstanceOf(Object);
          expect(result).toHaveProperty('_active', false);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.actions['search.get']).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(1);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty('params');
          expect(eventArgs[0].params).toEqual({...query, type: 'items'});
          expect(spec.events).toEqual({});
          // stop FakeService
          broker.destroyService(FakeService).then(done);
        });
    });
  });

  describe('Patch action behavior', () => {
    it('should patch an item', async (done) => {
      const params = {
        id: 'itemId',
        0: {} // first JSON patch operation
      };
      const cb = jest.fn(() => Promise.resolve({}));
      const FakeService = broker.createService({
        name: 'entity',
        actions: {
          patch: {
            handler: cb,
          }
        }
      });
      expect(FakeService).toBeDefined();
      return FakeService._start()
        .then(async () => {
          const result = await broker.call('items.patch', params);
          expect(result).toBeInstanceOf(Object);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.actions['entity.patch']).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(1);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty('params');
          expect(eventArgs[0].params).toHaveProperty('id', 'itemId');
          expect(eventArgs[0].params).toHaveProperty('patches');
          expect(eventArgs[0].params.patches).toHaveLength(1);
          expect(eventArgs[0].params.patches[0]).toEqual(params['0']);
          expect(spec.events).toEqual({});
          // stop FakeService
          return broker.destroyService(FakeService).then(done);
        });
    });
    it('should patch an unknown item', async (done) => {
      const params = {
        id: 'itemId',
        0: {} // first JSON patch operation
      };
      const cb = jest.fn(() => Promise.resolve(undefined));
      const FakeService = broker.createService({
        name: 'entity',
        actions: {
          patch: {
            handler: cb,
          }
        }
      });
      expect(FakeService).toBeDefined();
      return FakeService._start()
        .then(async () => {
          const result = await broker.call('items.patch', params);
          expect(result).toEqual(null);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.actions['entity.patch']).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(1);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty('params');
          expect(eventArgs[0].params).toHaveProperty('id', 'itemId');
          expect(eventArgs[0].params).toHaveProperty('patches');
          expect(eventArgs[0].params.patches).toHaveLength(1);
          expect(eventArgs[0].params.patches[0]).toEqual(params['0']);
          expect(spec.events).toEqual({});
          // stop FakeService
          return broker.destroyService(FakeService).then(done);
        });
    });
  });
});

