/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");

const PACKET_REQUEST = "REQ";
const PACKET_EVENT = "EVENT";

/**
 * Transporter for Kafka-Streams
 *
 * More info: http://kafka.apache.org/
 *
 * @class KafkaStreamTransporter
 * @extends {Transporter}
 */
class KafkaStreamTransporter extends require("moleculer").Transporters.Base {

	/**
	 * Creates an instance of KafkaStreamTransporter.
	 *
	 * @param {any} opts
	 *
	 * @memberof KafkaStreamTransporter
	 */
	constructor(opts) {
		if (typeof opts == "string")
			opts = { url: opts };

		super(opts);

		if (!this.opts)
			this.opts = {};

		// Use the 'preserveBuffers' option as true as default
		if (this.opts.preserveBuffers !== false)
			this.opts.preserveBuffers = true;

		if (this.opts.maxReconnectAttempts == null)
			this.opts.maxReconnectAttempts = -1;

		this.hasBuiltInBalancer = true;
		this.stream = null;

		this.subscriptions = {};
    
		this.KafkaStreams;
		try {
			this.KafkaStreams = require("kafka-streams").KafkaStreams;
		} catch(err) {
			/* istanbul ignore next */
			console.error("The 'kafka-streams' package is missing! Please install it with 'npm install kafka-streams --save' command.", err, true);
		}
	}

	/**
	 * Connect to a Kafka-Stream server
	 *
	 * @memberof KafkaStreamTransporter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			const kafkaStreams = new this.KafkaStreams(this.opts);
			this.stream = kafkaStreams.getKStream(null);
			this.stream.start().then(() => {
				this.onConnected().then(resolve).catch(reject);
			});
		});
	}

	/**
	 * Disconnect from a Kafka-Streams
	 *
	 * @memberof KafkaStreamTransporter
	 */
	disconnect() {
		if (this.stream) {
			this.stream.close();
			this.stream = null;
		}
		Object.keys(this.subscriptions).forEach(key => {
			this.subscriptions[key].close();
			this.subscriptions[key] = null;
		});
	}

	/**
	 * Reconnect to server after x seconds
	 *
	 * @memberof KafkaStreamTransporter
	 */
	reconnectAfterTime() {
		this.logger.info("Reconnecting after 5 sec...");
		setTimeout(() => {
			this.connect();
		}, 5 * 1000);
	}

	/**
	 * Subscribe to a event-stream
	 *
	 * @param {String} topic
	 * @param {String} nodeID
	 *
	 * @memberof KafkaStreamTransporter
	 */
	subscribe(cmd, nodeID) {
		const topic = this.getTopicName(cmd, nodeID);
		/* istanbul ignore next*/
		if (!this.stream) return Promise.resolve();
    
		this.stream.from(topic);
		this.stream.filter(message => !Buffer.isBuffer(message.value));
		this.stream.forEach(msg => {
			this.incomingMessage(cmd, msg);
			this.logger.info({ notice: "new message to process", message: msg});
		});
		return Promise.resolve();
	}
  


	/**
	 * Subscribe to balanced action commands
	 *
	 * @param {String} action
	 * @memberof KafkaTransporter
	 */
	subscribeBalancedRequest(action) {
		const topic = `${this.prefix}.${PACKET_REQUEST}B.${action}`;
		
		const kafkaStreams = new this.KafkaStreams(this.opts);
		const stream = kafkaStreams.getKStream(topic);
		stream.forEach((msg) => this.incomingMessage(PACKET_REQUEST, msg));
		this.subscriptions[topic] = stream;
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof NatsTransporter
	 */
	subscribeBalancedEvent(event, group) {
		const topic = `${this.prefix}.${PACKET_EVENT}B.${group}.${event}`;

		const kafkaStreams = new this.KafkaStreams(this.opts);
		const stream = kafkaStreams.getKStream(topic);
		stream.forEach((msg) => this.incomingMessage(PACKET_EVENT, msg));
		this.subscriptions[topic] = stream;
	}

	/**
	 * Unsubscribe all balanced request and event commands
	 *
	 * @memberof BaseTransporter
	 */
	unsubscribeFromBalancedCommands() {
		return new Promise(resolve => {
			Object.keys(this.subscriptions).forEach(key => { 
				const stream = this.subscriptions[key];
				stream.close();
				this.subscriptions[key] = null;
			});
			this.subscriptions = {};

			try {
				this.stream.close();
			} catch (err) {
				this.logger.warn({ notice: "When closing Kafka-stream", err});
			}
			return resolve();
		});
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberof KafkaStreamTransporter
	 */
	publish(packet) {
		/* istanbul ignore next*/
		if (!this.stream) return Promise.resolve();

		return new Promise((resolve, reject) => {
			const topic = this.getTopicName(packet.type, packet.target);
			let stream = this.subscriptions[topic];
			if (!stream) {
				const kafkaStreams = new this.KafkaStreams(this.opts);
				stream = kafkaStreams.getKStream(null);
			}
			stream.start().then(() => {
				stream.to(topic);
				const data = this.serialize(packet);
				this.incStatSent(data.length);
				stream.writeToStream(JSON.stringify(data));
				this.logger.info({ notice: "data have been written to stream", topic });
				return resolve();
			});
		});
	}
  


	/**
	 * Publish a balanced EVENT packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @param {String} group
	 * @returns {Promise}
	 * @memberof KafkaStreamTransporter
	 */
	publishBalancedEvent(packet, group) {
		/* istanbul ignore next*/
		if (!this.stream) return Promise.resolve();

		return new Promise(resolve => {
			let topic = `${this.prefix}.${PACKET_EVENT}B.${group}.${packet.payload.event}`;
			const data = this.serialize(packet);

			this.incStatSent(data.length);
			const stream = this.subscriptions[topic];
			if (!stream) return resolve();
			stream.start().then(() => {
				stream.writeToStream(data);
				return resolve();
			});
		});
	}

	/**
	 * Publish a balanced REQ packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 * @memberof AmqpTransporter
	 */
	publishBalancedRequest(packet) {
		/* istanbul ignore next*/
		if (!this.client) return Promise.resolve();

		return new Promise(resolve => {
			const topic = `${this.prefix}.${PACKET_REQUEST}B.${packet.payload.action}`;
			const data = this.serialize(packet);

			this.incStatSent(data.length);
			const stream = this.subscriptions[topic];
			stream.start().then(() => {
				stream.writeToStream(data);
				return resolve();
			});
		});
	}
}

module.exports = KafkaStreamTransporter;