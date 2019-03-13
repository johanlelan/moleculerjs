'use strict';

const { ServiceBroker } = require('moleculer');
const TestService = require('../../services/users.service');

describe('Test \'Users\' service', () => {
  let broker = new ServiceBroker();
  broker.createService(TestService);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  it('should create a user', async (done) => {
    const item = { title: 'A user' };
    const cb = jest.fn(() => Promise.resolve(item));
    const FakeUserService = broker.createService({
      name: 'user',
      actions: {
        create: {
          handler: cb,
        }
      }
    });
    expect(FakeUserService).toBeDefined();
    return FakeUserService._start()
      .then(async () => {
        const result = await broker.call('users.register', item);
        expect(result).toHaveProperty('title', item.title);
      }).then(() => {
        const spec = FakeUserService._serviceSpecification;
        expect(spec.actions['user.create']).toBeDefined();
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
        broker.destroyService(FakeUserService).then(done);
      });
  });

  it('should log in a user', async (done) => {
    const credentials = {
      user: {
        username: 'username',
        password: 'password',
      }
    };
    const cb = jest.fn(() => Promise.resolve({
      token: 'USERTOKEN',
    }));
    const FakeUserService = broker.createService({
      name: 'user',
      actions: {
        login: {
          handler: cb,
        }
      }
    });
    expect(FakeUserService).toBeDefined();
    return FakeUserService._start()
      .then(async () => {
        const result = await broker.call('users.login', credentials);
        expect(result).toHaveProperty('token');
      }).then(() => {
        const spec = FakeUserService._serviceSpecification;
        expect(spec.actions['user.login']).toBeDefined();
        expect(cb).toHaveBeenCalledTimes(1);
        const calls = cb.mock.calls;
        expect(calls).toHaveLength(1);
        const eventArgs = cb.mock.calls[0];
        expect(eventArgs).toHaveLength(1);
        expect(eventArgs[0]).toBeInstanceOf(Object);
        expect(eventArgs[0]).toHaveProperty('params');
        expect(eventArgs[0].params).toHaveProperty('user', credentials.user);
        expect(spec.events).toEqual({});
        // stop FakeService
        broker.destroyService(FakeUserService).then(done);
      });
  });

  it('should active a user', async (done) => {
    const params = {
      id: 'userid',
    };
    const cb = jest.fn(() => Promise.resolve({}));
    const FakeUserService = broker.createService({
      name: 'user',
      actions: {
        activate: {
          handler: cb,
        }
      }
    });
    expect(FakeUserService).toBeDefined();
    return FakeUserService._start()
      .then(async () => {
        const result = await broker.call('users.activate', params);
        expect(result).toBeInstanceOf(Object);
      }).then(() => {
        const spec = FakeUserService._serviceSpecification;
        expect(spec.actions['user.activate']).toBeDefined();
        expect(cb).toHaveBeenCalledTimes(1);
        const calls = cb.mock.calls;
        expect(calls).toHaveLength(1);
        const eventArgs = cb.mock.calls[0];
        expect(eventArgs).toHaveLength(1);
        expect(eventArgs[0]).toBeInstanceOf(Object);
        expect(eventArgs[0]).toHaveProperty('params');
        expect(eventArgs[0].params).toHaveProperty('id', params.id);
        expect(spec.events).toEqual({});
        // stop FakeService
        broker.destroyService(FakeUserService).then(done);
      });
  });

  it('should list users', async (done) => {
    const params = {
      query: {}
    };
    const cb = jest.fn(() => Promise.resolve({
      users: [],
    }));
    const FakeSearchService = broker.createService({
      name: 'search',
      actions: {
        list: {
          handler: cb,
        }
      }
    });
    expect(FakeSearchService).toBeDefined();
    return FakeSearchService._start()
      .then(async () => {
        const result = await broker.call('users.list', params);
        expect(result).toHaveProperty('users');
        expect(result.users).toBeInstanceOf(Array);
      }).then(() => {
        const spec = FakeSearchService._serviceSpecification;
        expect(spec.actions['search.list']).toBeDefined();
        expect(cb).toHaveBeenCalledTimes(1);
        const calls = cb.mock.calls;
        expect(calls).toHaveLength(1);
        const eventArgs = cb.mock.calls[0];
        expect(eventArgs).toHaveLength(1);
        expect(eventArgs[0]).toBeInstanceOf(Object);
        expect(eventArgs[0]).toHaveProperty('params');
        expect(eventArgs[0].params).toHaveProperty('type', 'user');
        expect(eventArgs[0].params).toHaveProperty('query', params.query);
        expect(spec.events).toEqual({});
        // stop FakeService
        broker.destroyService(FakeSearchService).then(done);
      });
  });

  it('should remove a user', async (done) => {
    const params = {
      id: 'userid',
    };
    const cb = jest.fn(() => Promise.resolve({}));
    const FakeUserService = broker.createService({
      name: 'user',
      actions: {
        remove: {
          handler: cb,
        }
      }
    });
    expect(FakeUserService).toBeDefined();
    return FakeUserService._start()
      .then(async () => {
        const result = await broker.call('users.remove', params);
        expect(result).toBeInstanceOf(Object);
      }).then(() => {
        const spec = FakeUserService._serviceSpecification;
        expect(spec.actions['user.remove']).toBeDefined();
        expect(cb).toHaveBeenCalledTimes(1);
        const calls = cb.mock.calls;
        expect(calls).toHaveLength(1);
        const eventArgs = cb.mock.calls[0];
        expect(eventArgs).toHaveLength(1);
        expect(eventArgs[0]).toBeInstanceOf(Object);
        expect(eventArgs[0]).toHaveProperty('params');
        expect(eventArgs[0].params).toHaveProperty('id', params.id);
        expect(spec.events).toEqual({});
        // stop FakeService
        broker.destroyService(FakeUserService).then(done);
      });
  });

  describe('Get behavior', () => {
    it('should get a user', async (done) => {
      const params = {
        id: 'userId',
      };
      const cb = jest.fn(() => Promise.resolve({
        _active: true,
      }));
      const FakeSearchService = broker.createService({
        name: 'search',
        actions: {
          get: {
            handler: cb,
          }
        }
      });
      expect(FakeSearchService).toBeDefined();
      return FakeSearchService._start()
        .then(async () => {
          const result = await broker.call('users.get', params);
          expect(result).toHaveProperty('_active');
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
          expect(eventArgs[0].params).toHaveProperty('type', 'user');
          expect(eventArgs[0].params).toHaveProperty('id', params.id);
          expect(spec.events).toEqual({});
          // stop FakeService
          broker.destroyService(FakeSearchService).then(done);
        });
    });
    it('should manage unknown user', async (done) => {
      const params = {
        id: 'userId',
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
      expect(FakeSearchService).toBeDefined();
      return FakeSearchService._start()
        .then(async () => {
          const result = await broker.call('users.get', params);
          expect(result).toEqual(undefined);
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
          expect(eventArgs[0].params).toHaveProperty('type', 'user');
          expect(eventArgs[0].params).toHaveProperty('id', params.id);
          expect(spec.events).toEqual({});
          // stop FakeService
          broker.destroyService(FakeSearchService).then(done);
        });
    });
    it('should manage disabled user', async (done) => {
      const params = {
        id: 'userId',
      };
      const cb = jest.fn(() => Promise.resolve({
        _active: false,
      }));
      const FakeSearchService = broker.createService({
        name: 'search',
        actions: {
          get: {
            handler: cb,
          }
        }
      });
      expect(FakeSearchService).toBeDefined();
      return FakeSearchService._start()
        .then(async () => {
          const result = await broker.call('users.get', params);
          expect(result).toHaveProperty('_active', false);
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
          expect(eventArgs[0].params).toHaveProperty('type', 'user');
          expect(eventArgs[0].params).toHaveProperty('id', params.id);
          expect(spec.events).toEqual({});
          // stop FakeService
          broker.destroyService(FakeSearchService).then(done);
        });
    });
  });

  describe('Patch behavior', () => {
    it('should patch a user', async (done) => {
      const params = {
        id: 'userId',
        0: { op: 'add', path: '/title', value: 'new user title' },
        1: { op: 'add', path: '/email', value: 'test@example.com' },
      };
      const cb = jest.fn(() => Promise.resolve({
        _active: true,
      }));
      const cb1 = jest.fn(() => Promise.resolve({}));
      const FakeSearchService = broker.createService({
        name: 'search',
        actions: {
          get: {
            handler: cb,
          }
        }
      });
      const FakeUserService = broker.createService({
        name: 'user',
        actions: {
          update: {
            handler: cb1,
          }
        }
      });
      expect(FakeSearchService).toBeDefined();
      return FakeSearchService._start()
        .then(() => FakeUserService._start())
        .then(async () => {
          const result = await broker.call('users.patch', params);
          expect(result).toBeInstanceOf(Object);
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
          expect(eventArgs[0].params).toHaveProperty('type', 'user');
          expect(eventArgs[0].params).toHaveProperty('id', 'userId');
          expect(spec.events).toEqual({});
          // stop FakeService
          return broker.destroyService(FakeSearchService);
        }).then(() => {
          const spec = FakeUserService._serviceSpecification;
          expect(spec.actions['user.update']).toBeDefined();
          expect(cb1).toHaveBeenCalledTimes(1);
          const calls = cb1.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb1.mock.calls[0];
          expect(eventArgs).toHaveLength(1);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty('params');
          expect(eventArgs[0].params).toHaveProperty('user');
          expect(eventArgs[0].params).toHaveProperty('patches');
          expect(spec.events).toEqual({});
          // stop FakeService
          broker.destroyService(FakeUserService).then(done);
        });
    });
    it('should manage unknown user', async (done) => {
      const params = {
        id: 'userId',
        0: { op: 'add', path: '/title', value: 'new user title' },
        1: { op: 'add', path: '/email', value: 'test@example.com' },
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
      expect(FakeSearchService).toBeDefined();
      return FakeSearchService._start()
        .then(async () => {
          const result = await broker.call('users.patch', params);
          expect(result).toEqual(undefined);
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
          expect(eventArgs[0].params).toHaveProperty('type', 'user');
          expect(eventArgs[0].params).toHaveProperty('id', 'userId');
          expect(spec.events).toEqual({});
          // stop FakeService
          return broker.destroyService(FakeSearchService).then(done);
        });
    });
    it('should manage disabled user', async (done) => {
      const params = {
        id: 'userId',
        0: { op: 'add', path: '/title', value: 'new user title' },
        1: { op: 'add', path: '/email', value: 'test@example.com' },
      };
      const cb = jest.fn(() => Promise.resolve({
        _active: false,
      }));
      const FakeSearchService = broker.createService({
        name: 'search',
        actions: {
          get: {
            handler: cb,
          }
        }
      });
      expect(FakeSearchService).toBeDefined();
      return FakeSearchService._start()
        .then(async () => {
          const result = await broker.call('users.patch', params);
          expect(result).toBeInstanceOf(Object);
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
          expect(eventArgs[0].params).toHaveProperty('type', 'user');
          expect(eventArgs[0].params).toHaveProperty('id', 'userId');
          expect(spec.events).toEqual({});
          // stop FakeService
          return broker.destroyService(FakeSearchService).then(done);
        });
    });
  });
});

