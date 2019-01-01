// simple proxy for entity items
const toArray = require("lodash.values");

module.exports = {
	name: "users",
	events: {
		"user.*"(payload, sender, event) {
			console.log(`Event '${event}' received from ${sender} node:`, payload);
		},
	},
	actions: {
		login(ctx) {
			return ctx.broker.call("user.login", ctx.params)
				.then(res => {
					ctx.meta.$statusCode = 200;
					return res;
				});
		},
		register(ctx) {
			return ctx.broker.call("user.create", ctx.params)
				.then(res => {
					ctx.meta.$statusCode = 201;
					ctx.meta.$responseHeaders = {
						"Location": `/api/users/${res.id}`,
					};
					return res;
				});
		},
		list(ctx) {
			return ctx.broker.call("search.list", { ...ctx.params, type: "user" });
		},
		get: {
			params: {
				id: "string"
			},
			handler(ctx) {
				return ctx.broker.call("search.get", { id: ctx.params.id, type: "user" })
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
				return this.broker.call("search.get", { id, type: "user" })
					.then(user => {
						if (!user) {
							// Not found
							ctx.meta.$statusCode = 404;
							return;
						} else if (user.active === false) {
							// Gone
							ctx.meta.$statusCode = 410;
							return user;
						}
						const patches = toArray(ctx.params);
						return this.broker.call("user.update", { user, patches });
					});
			}
		},
		remove: {
			params: {
				id: "string"
			},
			handler(ctx) {
				return ctx.broker.call("user.remove", { id: ctx.params.id })
					.then(res => {
						ctx.meta.$statusCode = 204;
						return res;
					});
			}
		}
	}
};