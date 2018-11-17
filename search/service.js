const { ServiceBroker } = require("moleculer");

const broker = new ServiceBroker(require("./moleculer.config"));

broker.createService({
	name: "search",
	events: {
		"entity.created"(payload) {
			this.logger.info({ notice: "Index an item into search engine", payload });
			this.broker.broadcast("search.updated", payload);
		}
	},
	actions: {
		list(ctx) {
			const payload = ctx.params;
			// validate input
			// filter search engine
			this.logger.info({ notice: "list all matching items", payload });
			// emit search.filtered event
			this.broker.broadcast("search.filtered", payload);
			return { sample: true, from: "search", total: 27, data: [] };
		},
		get(ctx) {
			const identifier = ctx.params.id;
			// get from search engine by identifier
			this.logger.info({ notice: "return existing item", identifier });
			// emit search.found event
			this.broker.broadcast("search.found", identifier);
			return { sample: true, from: "search", id: identifier };
		},
	},
});

broker.start()
	.then(() => broker.logger.info("Search service is ready"))
	.catch(err => broker.logger.error(`Error occured! ${err.message}`));
