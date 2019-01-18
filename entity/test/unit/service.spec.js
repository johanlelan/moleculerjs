"use strict";

const { ServiceBroker } = require("moleculer");
const ServiceUnderTest = require("../../service");

describe("Test 'entity' service", () => {
  let broker = new ServiceBroker({
    logger: false,
  });
  broker.createService(ServiceUnderTest);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  describe("Test 'entity.create' action", () => {
    it("should return an 'entity' item", async (done) => {
      const item = { title: "should return an 'entity' item" };
      const cb = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "entity.created": {
            handler: cb,
          }
        }
      });
      expect(FakeService).toBeDefined();
      return FakeService._start()
        .then(async () => {
          const result = await broker.call("entity.create", item);
          expect(result).toHaveProperty("_id");
          expect(result).toHaveProperty("_active", true);
          expect(result).toHaveProperty("_timestamp");
          expect(result).toHaveProperty("_type");
          expect(result).toHaveProperty("title", item.title);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["entity.created"]).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("entity.created");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("_id");
          expect(eventArgs[0]).toHaveProperty("_active");
          expect(eventArgs[0]).toHaveProperty("_timestamp");
          expect(eventArgs[0]).toHaveProperty("_type");
          expect(eventArgs[0]).toHaveProperty("title", item.title);
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(FakeService).then(done);
        });
    });
  });
  describe("Test 'entity.remove' action", () => {
    it("should return a disabled 'entity' item", async (done) => {
      const id = "itemId";
      const cb = jest.fn();
      const cbES = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "entity.removed": {
            handler: cb,
          }
        }
      });
      const EventStoreService = broker.createService({
        name: "event-store",
        actions: {
          "getAllEvents": {
            handler: cbES,
          }
        }
      });
      cbES.mockReturnValue([{
        name: "entity.created",
        data: {
          _id: "test remove",
          _active: "true",
          _timestamp: 1547830043461,
          _type: "entity",
          title: "should return a disabled 'entity' item",
        }
      }]);
      expect(EventStoreService).toBeDefined();
      expect(FakeService).toBeDefined();
      return EventStoreService._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("entity.remove", { id });
          expect(result).toHaveProperty("_id");
          expect(result).toHaveProperty("_active", false);
          expect(result).toHaveProperty("_timestamp");
          expect(result).toHaveProperty("_type");
        }).then(() => {
          expect(cbES).toHaveBeenCalledTimes(1);
          // stop EventStoreService
          broker.destroyService(EventStoreService);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["entity.removed"]).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("entity.removed");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("id");
          expect(eventArgs[0]).toHaveProperty("timestamp");
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(FakeService).then(done);
        });
    });
    it("should do nothing on unknown item", async (done) => {
      const id = "unknownId";
      const cb = jest.fn();
      const cbES = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "entity.removed": {
            handler: cb,
          }
        }
      });
      const EventStoreService = broker.createService({
        name: "event-store",
        actions: {
          "getAllEvents": {
            handler: cbES,
          }
        }
      });
      cbES.mockReturnValue([]);
      expect(EventStoreService).toBeDefined();
      expect(FakeService).toBeDefined();
      return EventStoreService._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("entity.remove", { id });
          expect(result).toBeUndefined();
        }).then(() => {
          expect(cb).toHaveBeenCalledTimes(0);
          // stop EventStoreService
          broker.destroyService(EventStoreService);
        }).then(() => {
          // stop FakeService
          broker.destroyService(FakeService).then(done);
        });
    });
  });
  describe("Test 'entity.patch' action", () => {
    it("should return a patched 'entity' item", async (done) => {
      const id = "patchId";
      const cb = jest.fn();
      const cbES = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "entity.patched": {
            handler: cb,
          }
        }
      });
      const EventStoreService = broker.createService({
        name: "event-store",
        actions: {
          "getAllEvents": {
            handler: cbES,
          }
        }
      });
      cbES.mockReturnValue([{
        name: "entity.created",
        data: {
          _id: "test ES",
          _active: true,
          _timestamp: 1547830043461,
          _type: "entity",
        }
      }]);
      expect(EventStoreService).toBeDefined();
      expect(FakeService).toBeDefined();
      const patches = [{
        "op": "add",
        "path": "/title",
        "value": "should return a disabled 'entity' item",
      }];
      return EventStoreService._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("entity.patch", { id, patches });
          expect(result).toHaveProperty("_id");
          expect(result).toHaveProperty("_active");
          expect(result).toHaveProperty("_timestamp");
          expect(result).toHaveProperty("_type");
          expect(result).toHaveProperty("title", patches[0].value);
        }).then(() => {
          expect(cbES).toHaveBeenCalledTimes(1);
          // stop EventStoreService
          broker.destroyService(EventStoreService);
        }).then(() => {
          const spec = FakeService._serviceSpecification;
          expect(spec.events["entity.patched"]).toBeDefined();
          expect(cb).toHaveBeenCalledTimes(1);
          const calls = cb.mock.calls;
          expect(calls).toHaveLength(1);
          const eventArgs = cb.mock.calls[0];
          expect(eventArgs).toHaveLength(3);
          expect(eventArgs[2]).toEqual("entity.patched");
          expect(eventArgs[0]).toBeInstanceOf(Object);
          expect(eventArgs[0]).toHaveProperty("id");
          expect(eventArgs[0]).toHaveProperty("patches");
          // patch function should change timestamp to keep tracking of updated timestamp
          expect(eventArgs[0].patches).toHaveLength(2);
          expect(eventArgs[0].patches[1]).toHaveProperty("path", "/_timestamp");
          expect(spec.actions).toEqual({});
          // stop FakeService
          broker.destroyService(FakeService).then(done);
        });
    });
    it("should do nothing on unknown item", async (done) => {
      const id = "unknownId";
      const cb = jest.fn();
      const cbES = jest.fn();
      const FakeService = broker.createService({
        name: "test",
        events: {
          "entity.patched": {
            handler: cb,
          }
        }
      });
      const EventStoreService = broker.createService({
        name: "event-store",
        actions: {
          "getAllEvents": {
            handler: cbES,
          }
        }
      });
      const patches = [{
        "op": "add",
        "path": "/title",
        "value": "should return a disabled 'entity' item",
      }];
      cbES.mockReturnValue([]);
      expect(EventStoreService).toBeDefined();
      expect(FakeService).toBeDefined();
      return EventStoreService._start()
        .then(() => FakeService._start())
        .then(async () => {
          const result = await broker.call("entity.patch", { id, patches });
          expect(result).toBeUndefined();
        }).then(() => {
          expect(cb).toHaveBeenCalledTimes(0);
          // stop EventStoreService
          broker.destroyService(EventStoreService);
        }).then(() => {
          // stop FakeService
          broker.destroyService(FakeService).then(done);
        });
    });
  });
  describe("Test event-sourcing replay method", () => {
    it("should not use initState on created event", () => {
      const id = "apply ES";
      const events = [{
        name: "entity.created",
        data: {
          _id: id,
        }
      }];
      const initialState = { init: true };
      // initialState should be override by entity.created event data
      const { state: finalState } = ServiceUnderTest.methods.replay(events, initialState);
      expect(finalState).toHaveProperty("_id", id);
      expect(finalState).not.toHaveProperty("init", true);
    });
    it("should use initState on other events", () => {
      const id = "apply ES";
      const amount = 543.67;
      const title = "should return a disabled 'entity' item";
      const finalTimestamp = 1547830043464;
      const events = [{
        name: "entity.patched",
        data: {
          id,
          patches: [{
            "op": "add",
            "path": "/title",
            "value": title,
          }, {
            "op": "add",
            "path": "/_timestamp",
            "value": 1547830043462,
          }]
        }
      },  {
        name: "entity.patched",
        data: {
          id,
          patches: [{
            "op": "add",
            "path": "/amount",
            "value": amount,
          }, {
            "op": "add",
            "path": "/_timestamp",
            "value": 1547830043463,
          }]
        }
      }, {
        name: "entity.removed",
        data: {
          id,
          timestamp: finalTimestamp,
        }
      }];
      const initialState = { _id: id, init: true };
      const { state: finalState } = ServiceUnderTest.methods.replay(events, initialState);
      expect(finalState).toHaveProperty("_id", id);
      expect(finalState).toHaveProperty("init", true);
      expect(finalState).toHaveProperty("amount", amount);
      expect(finalState).toHaveProperty("title", title);
      expect(finalState).toHaveProperty("_active", false);
      expect(finalState).toHaveProperty("_timestamp", finalTimestamp);
    });
    it("should skip unknown events", () => {
      const id = "apply ES";
      const type = "entity";
      const finalTimestamp = 1547830043461;
      const events = [{
        name: "entity.created",
        data: {
          _id: id,
          _active: true,
          _timestamp: finalTimestamp,
          _type: type,
        }
      }, {
        name: "entity.unknown",
        data: {
          what: "ever"
        }
      }];
      // start replaying without initial state
      const { state: finalState } = ServiceUnderTest.methods.replay(events);
      expect(finalState).toHaveProperty("_id", id);
      expect(finalState).toHaveProperty("_active", true);
      expect(finalState).toHaveProperty("_timestamp", finalTimestamp);
      expect(finalState).toHaveProperty("_type", type);
    });
  });
});

