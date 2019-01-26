"use strict";

const kafkaMixin = require("./mixins/kafka-streams.mixin")();

module.exports = {
  name: "event-store",
  mixins: [
    kafkaMixin,
  ],
  /**
	 * Service settings
	 */
  settings: {
  },
  /**
	 * Service dependencies
	 */
  //dependencies: [],	
  /**
	 * Events
	 */
  events: {
    "**": {
      async handler(payload, sender, event) {
        // skip all internal events
        if (event.indexOf("$") > -1 || event.indexOf("metrics.trace") > -1) return;
        this.logger.info(`Event '${event}' received from ${sender} node:`, payload);
        // save all events into event-stream
        const savedEvent = await this.appendToStream(sender, event, payload);
        this.logger.info("Save incoming event to event-store", savedEvent);
      },
    },
  },
  /**
	 * Actions
	 */
  actions: {
    getAllEvents: {
      params: {
        aggregate: "string",
        id: "string",
      },
      async handler(ctx) {
        return this.readFromStream(ctx.params.aggregate, ctx.params.id);
      }
    },
    clear() {
      return this.clearES();
    }
  },
  /**
	 * Methods
	 */
  methods: {
  },
};