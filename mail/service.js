"use strict";

const MailService = require("moleculer-mail");

module.exports = {
	name: "mail",

	mixins: [
		MailService,
	],

	/**
	 * Service settings
	 */
	settings: {
		from: "no-reply@real-app.moleculer.services",
		transport: {
			host: process.env.MAIL_HOST || "localhost",
			port: process.env.MAIL_PORT || 1025,
			tls: {
				rejectUnauthorized: false,
			}
		},
		templateFolder: "./templates",
		// Global data for templates
		data: {
			site: "Real app"
		}
	}
};