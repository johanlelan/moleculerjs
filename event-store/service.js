"use strict";
const crypto = require("crypto");
const assert = require("assert");
const DbService = require("moleculer-db");
const MongoDBAdapter = require("moleculer-db-adapter-mongo");

module.exports = {
  name: "event-store",
  mixins: [DbService],
  adapter: new MongoDBAdapter("mongodb://localhost/events-store", { useNewUrlParser: true }),
  collection: "events",
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
    // No action to save an event because this service listens all broker events!!!
    getAllEvents: {
      params: {
        aggregate: "string",
        id: "string",
      },
      async handler(ctx) {
        return this.readFromStream(ctx.params.aggregate, ctx.params.id);
      }
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
       * @param {string} kind 
       * @param {string} author 
       */
    createEvent(origin, name, content, author="anonymous") {
      assert.ok(origin, `Every event should have an origin : ${content}`);
      assert.ok(author, `Every event should have an author : ${content}`);
      assert.ok(content._id || content.id, `Every event payload should have an aggregateId (_id) : ${content}`);
      assert.ok(content, `Every event should have a content : ${content}`);
      assert.ok(content._type, `Every event should have a kind of aggregate (_type) : ${content}`);
      assert.ok(name, `Every event should be named : ${content}`);
      assert.ok(origin, `Every event should have an origin : ${content}`);
      const event = {};
      event.id = crypto.randomBytes(16).toString("hex");
      event.timestamp = content._timestamp || Date.now();
      event.origin = origin;
      event.name = name;
      event.aggregateId = content._id || content.id;
      event.author = author;
      event.data = content;
      event.version = 1;
      event.kind = content._type;
      return event;
    },
    /**
     * Read all events for a given aggregateId
     * @param {String} kind of aggregate 
     * @param {String} aggregateId 
     */
    async readFromStream(kind, aggregateId) {
      return await this.adapter.find({
        query: { kind, aggregateId },
        sort: ["+timestamp"],
        project: {_id: 0} });
    },
    /**
     * Write to event stream
     * @returns {Object} saved event
     */
    async appendToStream(sender, eventName, data) {
      const event = this.createEvent(sender, eventName, data);
      await this.adapter.insert(event);
    },
  },
};