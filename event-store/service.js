"use strict";

const crypto = require("crypto");
const assert = require("assert");
const eventstore = require("eventstore");

module.exports = {
	name: "event-store",

	/**
	 * Service settings
	 */
	settings: {
		es: null,
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
				if (event.indexOf("$") > -1) return;
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
				id: "string"
			},
			async handler(ctx) {
				const aggregateId = ctx.params.id;
				return this.readFromStream(aggregateId);
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
		 * Connect to database.
		 */
		connect() {
		},
		/**
		 * Disconnect from database.
		 */
		disconnect() {
		},
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
		/**
     * Write to event stream
     * @returns {Object} saved event
     */
		async appendToStream(sender, eventName, data) {
			const event = this.createEvent(eventName, sender, data, data._type || sender);
			// save event to event-store
			return new Promise((resolve, reject) => {
				this.es.getEventStream(event.aggregateId, (err, stream) => {
					if (err) return reject(err);
					stream.addEvent(event.data);
					stream.commit((err, stream) => {
						if (err) return reject(err);
						this.logger.debug("All added events in commit", stream.eventsToDispatch);
						resolve(event);
					});
				});
			});
		},
		/**
     * Read all events for a given aggregateId
     * @param {String} aggregateId 
     */
		readFromStream(aggregateId) {
			return new Promise((resolve, reject) => {
				this.es.getEventStream(aggregateId, (err, stream) => {
					if (err) return reject(err);
					resolve(stream.events);
				});
			});
		},
		/**
     * Remove all events from event-store
     */
		clearES() {
			return new Promise((resolve, reject) => {
				this.es.store.clear((err) => {
					if (err) return reject(err);
					resolve();
				});
			});
		},
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() {
		this.es = eventstore({
			type: "mongodb",
			url: process.EVENT_STORE_URI || "mongodb://localhost:27017/event-store", // optional
			eventsCollectionName: "events",             // optional
			snapshotsCollectionName: "snapshots",       // optional
			transactionsCollectionName: "transactions", // optional
			timeout: 10000,                              // optional
			maxSnapshotsCount: 3,                        // optional, defaultly will keep all snapshots
			positionsCollectionName: "positions", // optional, defaultly wont keep position
		});
	},
	/**
	 * Service started lifecycle event handler
	 */
	started() {
		return new Promise((resolve, reject) => {
			this.es.init((err) => {
				if (err) return reject(err);
				resolve();
			});
		});
	},
	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {
		return this.es.store.disconnect();
	}	
};