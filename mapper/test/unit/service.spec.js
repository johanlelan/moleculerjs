"use strict";

const { ServiceBroker } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const TestService = require("../../service");

describe("Test 'mapper' service", () => {
	let broker = new ServiceBroker({
		logger: false,
	});
	broker.createService(TestService);

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	describe("Test 'map' action", () => {
		it("should return a map JSON object", () => {
			const json = {
				foo: {
					title: "a single string",
				},
				bar: 4
			};
			const mapping = {
				title: {
					type: "jsonpath",
					value: "$.foo.title",
				},
				amount: {
					type: "constant",
					value: 1234.56
				}
			};
			expect(broker.call("mapper.map", {json, mapping})).resolves.toEqual({
				title: "a single string",
				amount: 1234.56,
			});
		});
		it("should return a validationError on invalid type", () => {
			const json = {};
			const mapping = {
				invalid: {
					type: "invalid",
				},
			};
			expect(broker.call("mapper.map", {json, mapping})).rejects.toEqual(
				new ValidationError("Invalid mapping type \"invalid\" on key \"invalid\""));
		});
	});
});


