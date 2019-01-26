const crypto = require("crypto");
const assert = require("assert");
const {KafkaStreams} = require("kafka-streams");

const config = require("./kafka.config")();

module.exports = function() {
  const settings = {
    es: null,
  };
  return {
    settings,
    actions: {

    },
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
        assert.ok(origin, `Every event should have an origin : ${content}`);
        assert.ok(author, `Every event should have an author : ${content}`);
        assert.ok(content._id || content.id, `Every event payload should have an aggregateId : ${content}`);
        assert.ok(content, `Every event should have a content : ${content}`);
        assert.ok(type, `Every event should have an aggregate type : ${content}`);
        assert.ok(name, `Every event should be named : ${content}`);
        assert.ok(origin, `Every event should have an origin : ${content}`);
        const event = {};
        event.id = crypto.randomBytes(16).toString("hex");
        event.timestamp = content.timestamp;
        event.origin = origin;
        event.name = name;
        event.aggregateId = content._id || content.id;
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
        const topic = eventName.split(".").shift();
        this.logger.debug("append to stream", {sender, eventName, data});
        const event = this.createEvent(eventName, sender, data, (data && data._type) || sender);
        // save event to event-store
        return new Promise((resolve, reject) => {
          try {
            const eventStream = this.es.getKStream(null);
            eventStream.to(topic);
            eventStream.start().then(() => {
              const message = {
                value: event,
                key: event.aggregateId,
                topic
              };
              eventStream.writeToStream(message);
              return event;
            }).then(event => {
              resolve(event);
            });
          } catch(err) {
            reject(err);
          }
        });
      },
      /**
       * Read all events for a given aggregateId
       * @param {String} aggregateId 
       */
      readFromStream(aggregate, aggregateId) {
        const events = [];
        return new Promise((resolve, reject) => {
          try {
            const eventStream = this.es.getKStream(aggregate);
            eventStream
              .mapJSONConvenience() //buffer -> json
              .mapWrapKafkaValue() //message.value -> value
              .filter(message => {
                return message.aggregateId === aggregateId;
              })
              .forEach((message) => {
                // add message to result events
                events.push(message);
              });
            eventStream.createAndSetProduceHandler().on("delivered", () => {
              resolve(events);
            });
            eventStream.start();
          } catch(err) {
            reject(err);
          }
        });
      },
      /**
       * Remove all events from event-store
       */
      clearES() {
        return Promise.resolve();
      },
    },
    created() {
      this.es = new KafkaStreams(config);
    },
    /**
     * Service started lifecycle event handler
     */
    started() {
      return Promise.resolve();
    },
    /**
     * Service stopped lifecycle event handler
     */
    stopped() {
      return this.es.closeAll();
    }	
  };
};