"use strict";

const { ServiceBroker } = require("moleculer");
const TestService = require("../../service");

jest.mock("elasticsearch");
const Elasticsearch = require("elasticsearch");
const spySearch = jest.fn();
const spyCreate = jest.fn();
const spyDelete = jest.fn();
Elasticsearch.Client = jest.fn(() => {
  return {
    ping: jest.fn(() => Promise.resolve()),
    bulk: jest.fn(() => Promise.resolve()),
    create: spyCreate,
    get: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: spyDelete,
    search: spySearch,
    count: jest.fn(() => Promise.resolve()),
    xyz: jest.fn(() => Promise.resolve())
  };
});

describe("Test 'search' service", () => {
  let broker = new ServiceBroker({
    logger: false,
  });

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  describe("Test 'search.getById' action", () => {

    it("should return an entity item", async (done) => {
      spySearch.mockReset();
      spySearch.mockResolvedValue({
        hits: {
          total: 1,
          hits: [{
            _source: {
              _id: "test",
              _type: "entity",
              _active: true,
            }
          }]
        }
      });
      const cb1 = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "search.found": {
            handler: cb1,
          }
        }
      });
      const serviceUnderTest = broker.createService(TestService);
      expect(FakeService).toBeDefined();
      return serviceUnderTest._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("search.getById", { id: "test", type: "entity" });
          expect(spySearch).toHaveBeenCalledTimes(1);
          expect(result).toHaveProperty("_id", "test");
          expect(result).toHaveProperty("_type", "entity");
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["search.found"]).toBeDefined();
          expect(cb1).toHaveBeenCalledTimes(1);
          const calls = cb1.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb1.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("search.found");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("_id");
          expect(eventArgs[0]).toHaveProperty("_type");
          expect(eventArgs[0]).toHaveProperty("_active", true);
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(serviceUnderTest)
            .then(() => broker.destroyService(FakeService))
            .then(done);
        });
    });
    
    it("should return a user", async (done) => {
      spySearch.mockReset();
      spySearch.mockResolvedValue({
        hits: {
          total: 1,
          hits: [{
            _source: {
              _id: "test",
              _type: "user",
              _active: true,
            }
          }]
        }
      });
      const cb1 = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "search.found": {
            handler: cb1,
          }
        }
      });
      const serviceUnderTest = broker.createService(TestService);
      expect(FakeService).toBeDefined();
      return serviceUnderTest._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("search.getById", { id: "test", type: "user" });
          expect(spySearch).toHaveBeenCalledTimes(1);
          expect(result).toHaveProperty("_id", "test");
          expect(result).toHaveProperty("_type", "user");
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["search.found"]).toBeDefined();
          expect(cb1).toHaveBeenCalledTimes(1);
          const calls = cb1.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb1.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("search.found");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("_id");
          expect(eventArgs[0]).toHaveProperty("_type");
          expect(eventArgs[0]).toHaveProperty("_active", true);
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(serviceUnderTest)
            .then(() => broker.destroyService(FakeService))
            .then(done);
        });
    });

    it("should manage unknown item", async (done) => {
      spySearch.mockReset();
      spySearch.mockResolvedValue({
        hits: {
          total: 0,
          hits: []
        }
      });
      const cb1 = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "search.notFound": {
            handler: cb1,
          }
        }
      });
      const serviceUnderTest = broker.createService(TestService);
      expect(FakeService).toBeDefined();
      return serviceUnderTest._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("search.getById", { id: "test", type: "user" });
          expect(spySearch).toHaveBeenCalledTimes(1);
          expect(result).toBeNull();
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["search.notFound"]).toBeDefined();
          expect(cb1).toHaveBeenCalledTimes(1);
          const calls = cb1.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb1.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("search.notFound");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("id");
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(serviceUnderTest)
            .then(() => broker.destroyService(FakeService))
            .then(done);
        });
    });

    it("should manage gone item", async (done) => {
      spySearch.mockReset();
      spySearch.mockResolvedValue({
        hits: {
          total: 0,
          hits: [{
            _source: {
              _id: "test",
              _type: "user",
              _active: false,
            }
          }]
        }
      });
      const cb1 = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "search.gone": {
            handler: cb1,
          }
        }
      });
      const serviceUnderTest = broker.createService(TestService);
      expect(FakeService).toBeDefined();
      return serviceUnderTest._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("search.getById", { id: "test", type: "user" });
          expect(spySearch).toHaveBeenCalledTimes(1);
          expect(result).toHaveProperty("_active", false);
          expect(result).toHaveProperty("_id", "test");
          expect(result).toHaveProperty("_type", "user");
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["search.gone"]).toBeDefined();
          expect(cb1).toHaveBeenCalledTimes(1);
          const calls = cb1.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb1.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("search.gone");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("_id");
          expect(eventArgs[0]).toHaveProperty("_type");
          expect(eventArgs[0]).toHaveProperty("_active", false);
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(serviceUnderTest)
            .then(() => broker.destroyService(FakeService))
            .then(done);
        });
    });
  });

  describe("Test 'search.list' action", () => {

    it("should return an empty list", async (done) => {
      spySearch.mockReset();
      spySearch.mockResolvedValue({
        hits: {
          total: 0,
          hits: []
        }
      });
      const cb1 = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "search.queried": {
            handler: cb1,
          }
        }
      });
      const serviceUnderTest = broker.createService(TestService);
      expect(FakeService).toBeDefined();
      return serviceUnderTest._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("search.list", { query: {
            "query": {
              "match": {
                "_active": false
              }
            }
          }, type: "entity" });
          expect(spySearch).toHaveBeenCalledTimes(1);
          expect(result).toBeInstanceOf(Object);
          expect(result).toHaveProperty("_type", "entity");
          expect(result).toHaveProperty("total", 0);
          expect(result).toHaveProperty("data");
          expect(result.data).toBeInstanceOf(Array);
          expect(result.data).toHaveLength(0);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["search.queried"]).toBeDefined();
          expect(cb1).toHaveBeenCalledTimes(1);
          const calls = cb1.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb1.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("search.queried");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("_type", "entity");
          expect(eventArgs[0]).toHaveProperty("total", 0);
          expect(eventArgs[0]).toHaveProperty("data");
          expect(eventArgs[0].data).toBeInstanceOf(Array);
          expect(eventArgs[0].data).toHaveLength(0);
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(serviceUnderTest)
            .then(() => broker.destroyService(FakeService))
            .then(done);
        });
    });
    
    it("should return an list", async (done) => {
      spySearch.mockReset();
      spySearch.mockResolvedValue({
        hits: {
          total: 4,
          hits: [{
            _source: {
              _id: "1",
              _type: "entity",
              _active: false,
            }
          }, {
            _source: {
              _id: "2",
              _type: "entity",
              _active: false,
            }
          }, {
            _source: {
              _id: "3",
              _type: "entity",
              _active: false,
            }
          }, {
            _source: {
              _id: "4",
              _type: "entity",
              _active: false,
            }
          }]
        }
      });
      const cb1 = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "search.queried": {
            handler: cb1,
          }
        }
      });
      const serviceUnderTest = broker.createService(TestService);
      expect(FakeService).toBeDefined();
      return serviceUnderTest._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("search.list", { query: {
            "query": {
              "match": {
                "_active": false
              }
            }
          }, type: "entity" });
          expect(spySearch).toHaveBeenCalledTimes(1);
          expect(result).toBeInstanceOf(Object);
          expect(result).toHaveProperty("_type", "entity");
          expect(result).toHaveProperty("total", 4);
          expect(result).toHaveProperty("data");
          expect(result.data).toBeInstanceOf(Array);
          expect(result.data).toHaveLength(4);
          expect(result.data[0]).toHaveProperty("_active", false);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["search.queried"]).toBeDefined();
          expect(cb1).toHaveBeenCalledTimes(1);
          const calls = cb1.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb1.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("search.queried");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("_type", "entity");
          expect(eventArgs[0]).toHaveProperty("total", 4);
          expect(eventArgs[0]).toHaveProperty("data");
          expect(eventArgs[0].data).toBeInstanceOf(Array);
          expect(eventArgs[0].data).toHaveLength(4);
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(serviceUnderTest)
            .then(() => broker.destroyService(FakeService))
            .then(done);
        });
    });
  });

  describe("Test events listener handlers", () => {

    describe("entity", () => {
      it("should index a created entity item", async (done) => {
        spyCreate.mockReset();
        spyCreate.mockResolvedValue({
          hits: {
            total: 1,
            hits: [{
              _source: {
                _id: "test",
                _type: "entity",
                _active: true,
              }
            }]
          }
        });
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.entity.indexed": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("entity.created", { 
              _id: "created",
              _type: "entity",
              _active: true,
            });
            expect(spyCreate).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.entity.indexed"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.entity.indexed");
            expect(eventArgs[0]).toBeInstanceOf(Object);
            expect(eventArgs[0]).toHaveProperty("_id");
            expect(eventArgs[0]).toHaveProperty("_type");
            expect(eventArgs[0]).toHaveProperty("_active", true);
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });
  
      it("should index on disabled entity item", async (done) => {
        spyCreate.mockReset();
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.entity.disabled": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("entity.disabled", { 
              _id: "disabled",
              _type: "entity",
              _active: false,
            });
            expect(spyCreate).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.entity.disabled"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.entity.disabled");
            expect(eventArgs[0]).toEqual("disabled");
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });

      it("should unindex on entity item deletion", async (done) => {
        spyDelete.mockReset();
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.entity.unindexed": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("entity.removed", { 
              _id: "removed",
              _type: "entity",
              _active: false,
            });
            expect(spyDelete).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.entity.unindexed"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.entity.unindexed");
            expect(eventArgs[0]).toEqual("removed");
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });

      it("should index a patched entity item", async (done) => {
        spyCreate.mockReset();
        spyCreate.mockResolvedValue({
          hits: {
            total: 1,
            hits: [{
              _source: {
                _id: "test",
                _type: "entity",
                _active: true,
              }
            }]
          }
        });
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.entity.indexed": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("entity.patched", {
              _id: "patched",
              _type: "entity",
              _active: true,
            });
            expect(spyCreate).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.entity.indexed"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.entity.indexed");
            expect(eventArgs[0]).toBeInstanceOf(Object);
            expect(eventArgs[0]).toHaveProperty("_id");
            expect(eventArgs[0]).toHaveProperty("_type");
            expect(eventArgs[0]).toHaveProperty("_active", true);
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });
    });
    
    describe("user", () => {

      it("should index on registered user", async (done) => {
        spyCreate.mockReset();
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.user.indexed": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("user.registered", { 
              _id: "registered",
              _type: "user",
              _active: false,
            });
            expect(spyCreate).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.user.indexed"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.user.indexed");
            expect(eventArgs[0]).toHaveProperty("_id", "registered");
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });

      it("should index on activated user", async (done) => {
        spyCreate.mockReset();
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.user.indexed": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("user.activated", { 
              _id: "activated",
              _type: "user",
              _active: false,
            });
            expect(spyCreate).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.user.indexed"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.user.indexed");
            expect(eventArgs[0]).toHaveProperty("_id", "activated");
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });

      it("should index on connected user", async (done) => {
        spyCreate.mockReset();
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.user.connected.indexed": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("user.connected", {
              token: 
                Buffer.from(JSON.stringify({ typ: "JWT", alg: "HS256" })).toString("base64") +
                "."+ Buffer.from(JSON.stringify({ sub: "connected", exp: 10 })).toString("base64") +
                ".SIGNATURE",
              username: "connected",
            });
            expect(spyCreate).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.user.connected.indexed"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.user.connected.indexed");
            expect(eventArgs[0]).toHaveProperty("_id", "connected");
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });

      it("should unindex on expired user session", async (done) => {
        spyCreate.mockReset();
        spyDelete.mockReset();
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.user.connected.indexed": {
              handler: cb1,
            },
            "search.user.connected.unindexed": {
              handler: cb2,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("user.connected", {
              token: 
                Buffer.from(JSON.stringify({ typ: "JWT", alg: "HS256" })).toString("base64") +
                "."+ Buffer.from(JSON.stringify({ sub: "connected", exp: 0 })).toString("base64") +
                ".SIGNATURE",
              username: "connected",
            });
            expect(spyCreate).toHaveBeenCalledTimes(1);
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            // wait 1s for session expire
            setTimeout(() => {
              expect(spyDelete).toHaveBeenCalledTimes(1);
              expect(spec.events["search.user.connected.unindexed"]).toBeDefined();
              expect(cb2).toHaveBeenCalledTimes(1);
              const calls = cb2.mock.calls;
              expect(calls).toHaveLength(1);
              const eventArgs = cb2.mock.calls[0];
              expect(eventArgs).toHaveLength(3);
              expect(eventArgs[2]).toEqual("search.user.connected.unindexed");
              expect(eventArgs[0]).toEqual("connected");
              // stop FakeService
              broker.destroyService(serviceUnderTest)
                .then(() => broker.destroyService(FakeService))
                .then(done);
            }, 3000);
          });
      });

      it("should skip an invalid connected user", async (done) => {
        spyCreate.mockReset();
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.user.connected.indexed": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("user.connected", {
              token: "",
              username: "connected",
            });
            expect(spyCreate).toHaveBeenCalledTimes(0);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.user.connected.indexed"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(0);
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });

      it("should index on disabled user", async (done) => {
        spyCreate.mockReset();
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.user.disabled": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("user.disabled", { 
              _id: "disabled",
              _type: "user",
              _active: false,
            });
            expect(spyCreate).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.user.disabled"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.user.disabled");
            expect(eventArgs[0]).toEqual("disabled");
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });
  
      it("should unindex on user deletion", async (done) => {
        spyDelete.mockReset();
        const cb1 = jest.fn();
        const FakeService = broker.createService({
          name: "test",
          events: {
            "search.user.unindexed": {
              handler: cb1,
            }
          }
        });
        const serviceUnderTest = broker.createService(TestService);
        expect(FakeService).toBeDefined();
        return serviceUnderTest._start()
          .then(() => FakeService._start())
          .then(async () => {
            await broker.broadcast("user.removed", { 
              _id: "removed",
              _type: "user",
              _active: false,
            });
            expect(spyDelete).toHaveBeenCalledTimes(1);
            // wait 300ms for event propagation
            return new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }).then(() => {
            const spec = FakeService._serviceSpecification;
            expect(spec.events["search.user.unindexed"]).toBeDefined();
            expect(cb1).toHaveBeenCalledTimes(1);
            const calls = cb1.mock.calls;
            expect(calls).toHaveLength(1);
            const eventArgs = cb1.mock.calls[0];
            expect(eventArgs).toHaveLength(3);
            expect(eventArgs[2]).toEqual("search.user.unindexed");
            expect(eventArgs[0]).toEqual("removed");
            expect(spec.actions).toEqual({});
            // stop FakeService
            broker.destroyService(serviceUnderTest)
              .then(() => broker.destroyService(FakeService))
              .then(done);
          });
      });
    });
  });
});

