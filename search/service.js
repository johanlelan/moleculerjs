const documents = {};
const users = {};
const connectedUsers = {};

const getCollection = (type) => {
	switch(type) {
		case "user":
			return users;
		default:
			return documents;
	}
};

module.exports = {
	name: "search",
	events: {
		"entity.created"(payload) {
			documents[payload.id] = payload;
			this.logger.info({ notice: "Index item", payload });
			this.broker.broadcast("search.indexed", payload);
		},
		"entity.removed"(payload) {
			const document = documents[payload.id];
			if (document) {
				document._active = false;
				this.logger.info({ notice: "Unindex item", id: payload.id });
				this.broker.broadcast("search.unindexed", payload.id);
			}
		},
		"entity.patched"({ id, entity }) {
			documents[id] = entity;
			this.logger.info({ notice: "Index item", document: entity });
			this.broker.broadcast("search.indexed", entity);
		},
		"user.connected"(user) {
			const jwtFragments = user.token.split(".");
			if (jwtFragments.length === 3) {
				const payload = JSON.parse(new Buffer(jwtFragments[1], "base64").toString("utf-8"));
				const time = payload.exp * 1000 - (new Date()).getTime();
				user.expire = () => setTimeout(() => {
					// remove connected user after jwt expiration period
					delete connectedUsers[user.username];
				}, time);
				connectedUsers[user.username] = user;
				this.logger.info({ notice: "Index connected user", user });
				this.broker.broadcast("search.user.connected.indexed", user);
			}
		},
		"user.registered"(user) {
			users[user.username] = user;
			this.logger.info({ notice: "Index user", user });
			this.broker.broadcast("search.user.indexed", user);
		},
		"user.removed"(payload) {
			const user = users[payload.id];
			if (user) {
				user._active = false;
				this.logger.info({ notice: "Unindex user", id: payload.id });
				this.broker.broadcast("search.user.unindexed", payload.id);
			}
		},
		"user.activated"(payload) {
			const user = users[payload.id];
			if (user) {
				user._active = true;
				this.logger.info({ notice: "Reindex user", id: payload.id });
				this.broker.broadcast("search.user.indexed", payload.id);
			}
		}
	},
	actions: {
		list(ctx) {
			const payload = ctx.params;
			const type = ctx.params.type;
			const collection = getCollection(type);
			// validate input
			// filter search engine
			this.logger.info({ notice: `list all matching ${type}`, payload });
			// emit search.query event
			this.broker.broadcast("search.query", payload);
			const data = Object.values(collection).filter(item => item._active !== false);
			// TODO JLL: need to manage pagination
			return { 
				_type: type,
				total: data.length,
				data,
			};
		},
		get(ctx) {
			const id = ctx.params.id;
			const type = ctx.params.type;
			// get from search engine by identifier
			const collection = getCollection(type);
			const document = collection[id];
			if (!document) {
				this.broker.broadcast("search.notFound", id);
				return null;
			} else if (!document._active) {
				this.broker.broadcast("search.gone", document);
				return document;
			}
			this.logger.info({ notice: `get ${type} by id`, id });
			// emit search.found event
			this.broker.broadcast("search.found", document);
			return { ...document };
		},
	},
	started() {
		this.logger.info("Search service is ready");
	},
};