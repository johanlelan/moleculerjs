"use strict";

const ApiGateway = require("moleculer-web");

module.exports = {
	name: "api",
	mixins: [ApiGateway],

	// More info about settings: https://moleculer.services/docs/0.13/moleculer-web.html
	settings: {
		port: process.env.PORT || 3000,

		routes: [{
			path: "/api",
			bodyParsers: {
				json: true
			},
			whitelist: [
				// Access to any actions in all services under "/api" URL
				"**"
			],
			mappingPolicy: "restrict",
			aliases: {
				"GET items": "items.list",
				"GET items/:id": "items.get",
				"POST items": "items.create",
				"PATCH items/:id": "items.patch",
				"DELETE items/:id": "items.remove"
			}
		}],

		// Serve assets from "public" folder
		assets: {
			folder: "public"
		}
	}
};
