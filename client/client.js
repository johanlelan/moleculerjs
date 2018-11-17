const assert = require('assert');
const { ServiceBroker } = require("moleculer");

const broker = new ServiceBroker({
  namespace: 'mol',
  transporter: "Redis",
  logger: console,
  logLevel: "debug",
});

const item = { title: 'My new item' };

broker.createService({
	name: "client",
	events: {
		"search.updated"(payload) {
      this.logger.info({ notice: "Search engine is updated", payload });
      assert.deepEqual(payload, item);
      broker.stop();
      process.exit(0);
		}
	}
});

broker.start()
    .then(() => broker.waitForServices("entity"))
    // Call service
    .then(() => broker.broadcast("entity.creation.needed", item))
    .then(() => broker.logger.info("Item have been created"))
    .catch(err => broker.logger.error(`Error occured! ${err.message}`));
