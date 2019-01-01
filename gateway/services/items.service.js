// simple proxy for entity items
const toArray = require("lodash.values");

module.exports = {
	name: "items",
	events: {
		"entity.*"(payload, sender, event) {
			console.log(`Event '${event}' received from ${sender} node:`, payload);
		},
		"search.*"(payload, sender, event) {
			console.log(`Event '${event}' received from ${sender} node:`, payload);
		},
		"db.*"(payload, sender, event) {
			console.log(`Event '${event}' received from ${sender} node:`, payload);
		},
	},
	actions: {
		create(ctx) {
			return ctx.broker.call("entity.create", ctx.params)
				.then(res => {
					ctx.meta.$statusCode = 201;
					ctx.meta.$responseHeaders = {
						"Location": `/api/items/${res.id}`,
					};
					return res;
				});
		},
		list(ctx) {
			return ctx.broker.call("search.list", ctx.params);
		},
		get: {
			params: {
				id: "string"
			},
			handler(ctx) {
				return ctx.broker.call("search.get", { id: ctx.params.id, type: "items" })
					.then(res => {
						if (!res) {
							// Not found
							ctx.meta.$statusCode = 404;
						} else if (res.active === false) {
							// Gone
							ctx.meta.$statusCode = 410;
						}
						return res;
					});
			}
		},
		patch: {
			params: {
				id: "string",
			},
			handler(ctx) {
				const id = ctx.params.id;
				delete ctx.params.id;
				// check if entity exists
				return this.broker.call("search.get", { id, type: "items" })
					.then(entity => {
						if (!entity || entity.active === false) {
							ctx.meta.$statusCode = 404;
							return null;
						}
						const patches = toArray(ctx.params);
						return ctx.broker.call("entity.patch", { id, patches });
					});
			}
		},
		remove: {
			params: {
				id: "string"
			},
			handler(ctx) {
				return ctx.broker.call("entity.remove", { id: ctx.params.id })
					.then(res => {
						ctx.meta.$statusCode = 204;
						return res;
					});
			}
		}
	}
};