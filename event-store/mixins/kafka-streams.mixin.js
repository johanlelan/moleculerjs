
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
       * Write to event stream
       * @returns {Object} saved event
       */
			async appendToStream(sender, eventName, data) {
				const topic = eventName.split(".").shift();
				const event = this.createEvent(eventName, sender, data, data._type || sender);
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