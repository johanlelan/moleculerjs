"use strict";

const { ServiceBroker } = require("moleculer");
const TestService = require("../../service");

describe("Test 'metrics' service", () => {
  let broker = new ServiceBroker({
    logger: false,
  });
  broker.createService(TestService);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  it("No test to run", () => {
    expect("metrics is a native moleculer mixin").toBe("metrics is a native moleculer mixin");
  });

});

