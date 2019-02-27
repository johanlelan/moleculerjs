"use strict";

const { ServiceBroker } = require("moleculer");
const TestService = require("../../service");

describe("Test 'mail' service", () => {
  let broker = new ServiceBroker();
  broker.createService(TestService);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  it("No test to run", () => {
    expect("mail is a native moleculer mixin").toBe("mail is a native moleculer mixin");
  });

});

