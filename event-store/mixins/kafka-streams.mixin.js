const crypto = require("crypto");
const assert = require("assert");
const {KafkaStreams} = require("kafka-streams");
const kafka = require("kafka-node");

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
        event.timestamp = content._timestamp || Date.now();
        event.origin = origin;
        event.name = name;
        event.aggregateId = content._id || content.id;
        event.author = author;
        event.data = content;
        event.version = 1;
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
            eventStream.to(topic, "auto", "buffer", 1, 0, (err) => console.error(err));
            eventStream.start().then(() => {
              const message = {
                id: event.aggregateId,
                key: event.aggregateId,
                payload: event,
                timestamp: event.timestamp,
                version: event.version,
                type: eventName,
              };
              eventStream.writeToStream(JSON.stringify(message));
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
          const client = new kafka.KafkaClient({ kafaHost: config.kafkaHost });
          const offset = new kafka.Offset(client);
          const topics = [{ topic: aggregate, partition: 0 }, { topic: aggregate, partition: 1 }];
          const options = { autoCommit: false, fetchMaxWaitMs: 1000, fetchMaxBytes: 1024 * 1024, fromOffset: true };
          client.on("ready", () => {
            const consumer = new kafka.Consumer(client, topics, options);
            consumer.on("message", function (message) {
              if (message.aggregateId === aggregateId) {
                events.push(message);
              }
            });
  
            consumer.on("error", function (err) {
              console.log("ERROR: " + err.toString());
              reject(err);
            });

            /*
            * If consumer get `offsetOutOfRange` event, fetch data from the smallest(oldest) offset
            */
            consumer.on("offsetOutOfRange", function (topic) {
              topic.maxNum = 2;
              offset.fetch([topic], function (err, offsets) {
                if (err) {
                  return console.error(err);
                }
                let min = Math.min.apply(null, offsets[topic.topic][topic.partition]);
                consumer.setOffset(topic.topic, topic.partition, min);
              });
            });
          });
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