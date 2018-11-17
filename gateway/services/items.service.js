// simple proxy for entity items
const toArray = require("lodash.values");

module.exports = {
	name: "items",
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
				return ctx.broker.call("search.get", { id: ctx.params.id })
					.then(res => {
						if (!res) {
							// Not found
							ctx.meta.$statusCode = 404;
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
				const patches = toArray(ctx.params);
				return ctx.broker.call("entity.patch", { id, patches })
					.then(res => {
						if (!res) {
							// Not found
							ctx.meta.$statusCode = 404;
						}
						return res;
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