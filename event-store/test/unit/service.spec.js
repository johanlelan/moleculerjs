"use strict";

const { ServiceBroker } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const TestService = require("../../service");

describe("Test 'event-store' service", () => {
	let broker = new ServiceBroker();
	broker.createService(TestService);

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());
	beforeEach(async () => {
		await broker.call("event-store.clear");
	});
	describe("Test 'event-store.getAllEvents' action", () => {
		it("should return an empty list of events", () => {
			expect(broker.call("event-store.getAllEvents", { id: "unknown" })).resolves.toEqual([]);
		});
		it("should reject an ValidationError", () => {
			expect(broker.call("event-store.getAllEvents")).rejects.toBeInstanceOf(ValidationError);
		});
	});
	describe("Test event-store append to stream", () => {
		it("should append a broker event to event-stream", (done) => {
			const aggregateId = "aggregateId";
			const event = {
				_id: aggregateId,
				_type: "anyKind",
				timestamp: Date.now(),
				title: "I am an event from moleculer broker",
			};
			broker.broadcast("append.tested", event);
			// wait 1s before check DB insertion
			setTimeout(async () => {
				const events = await broker.call("event-store.getAllEvents", { id: aggregateId });
				expect(events).toHaveLength(1);
				expect(events[0]).toHaveProperty("aggregateId", aggregateId);
				done();
			}, 1000);
		});
	});
});

