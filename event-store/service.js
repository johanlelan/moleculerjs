"use strict";

const crypto = require("crypto");
const assert = require("assert");

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
		/**
     * Prepare an event to save into Kafka from given content
     * @param {string} name 
     * @param {string} origin 
     * @param {Object} content 
     * @param {string} type 
     * @param {string} author 
     */
		createEvent(name, origin, content, type, author="anonymous") {
			assert.ok(origin, "Every event should have an origin");
			assert.ok(author, "Every event should have an author");
			assert.ok(content._id, "Every event payload should have an aggregateId");
			assert.ok(content, "Every event should have a content");
			assert.ok(type, "Every event should have an aggregate type");
			assert.ok(name, "Every event should be named");
			assert.ok(origin, "Every event should have an origin");
			const event = {};
			event.id = crypto.randomBytes(16).toString("hex");
			event.timestamp = content.timestamp;
			event.origin = origin;
			event.name = name;
			event.aggregateId = content._id;
			event.author = author;
			event.data = content;
			event.version = "1";
			return event;
		},
	},
};