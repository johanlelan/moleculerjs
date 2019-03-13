"use strict";
const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;

const { ServiceBroker } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;

const TestService = require("../../service");
// mock DB adapter
const doc = {
  toJSON: jest.fn(() => ({})),
  _id: {
    toHexString: jest.fn(() => "123")
  }
};
let toArrayCB = jest.fn(() => Promise.resolve([]));
const query = jest.fn(() => ({ toArray: toArrayCB }));
const fakeCollection = {
  countDocuments: jest.fn(() => Promise.resolve(7)),
  find: jest.fn(() => query()),
  findOne: jest.fn(() => Promise.resolve(doc)),
  insertOne: jest.fn(doc => Promise.resolve({ insertedCount: 1, ops: [doc] })),
  insertMany: jest.fn(arr => Promise.resolve({ insertedCount: arr.length, ops: arr })),
  updateMany: jest.fn(() => Promise.resolve({ modifiedCount: 2 })),
  findOneAndUpdate: jest.fn(() => Promise.resolve({ value: doc })),
  deleteMany: jest.fn(() => Promise.resolve({ deletedCount: 2 })),
  findOneAndDelete: jest.fn(() => Promise.resolve({ value: doc })),
};


let fakeConn = {
  on: jest.fn(),
  close: jest.fn(),
  collection: jest.fn(() => fakeCollection)
};

describe("Test 'event-store' service", () => {
  beforeAll(() => {
    fakeConn.on.mockClear();
    fakeConn.collection.mockClear();

    MongoClient.connect = jest.fn(() => Promise.resolve(fakeConn));
  });

  let broker = new ServiceBroker({
    logger: false,
  });
  broker.createService(TestService);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  describe("Test 'event-store.getAllEvents' action", () => {
    it("should return an empty list of events", () => {
      expect(broker.call("event-store.getAllEvents", { aggregate: "any", id: "unknown" })).resolves.toEqual([]);
    });
    it("should reject an ValidationError", () => {
      expect(broker.call("event-store.getAllEvents")).rejects.toBeInstanceOf(ValidationError);
    });
  });
  describe("Test event-store append to stream", () => {
    it("should append a broker event to event-stream", (done) => {
      const aggregateId = "aggregateId";
      const event1 = {
        _id: aggregateId,
        _type: "anyKind",
        timestamp: Date.now(),
        title: "I am an event from moleculer broker",
      };
      const event2 = {
        id: aggregateId,
        _type: "anyKind",
        timestamp: Date.now(),
        title: "I am an event from moleculer broker",
      };
      broker.broadcast("append.tested", event1);
      broker.broadcast("append.released", event2);
      
      // fake functions
      toArrayCB = jest.fn(() => Promise.resolve([
        TestService.methods.createEvent("test", "append.tested", event1),
        TestService.methods.createEvent("test", "append.released", event2),
      ]));
      
      // wait 1s before checking DB insertion
      setTimeout(async () => {
        const events = await broker.call("event-store.getAllEvents", { aggregate: "anyKind", id: aggregateId });
        expect(events).toHaveLength(2);
        expect(events[0]).toHaveProperty("aggregateId", aggregateId);
        expect(events[1]).toHaveProperty("aggregateId", aggregateId);
        expect(events[0]).toHaveProperty("name", "append.tested");
        expect(events[1]).toHaveProperty("name", "append.released");
        done();
      }, 1000);
    });
  });
});

