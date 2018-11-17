const { applyPatch } = require("fast-json-patch");
const { ServiceBroker } = require("moleculer");

const broker = new ServiceBroker(require("./moleculer.config"));

broker.createService({
	name: "entity",
	events: {
		"entity.creation.needed"(payload) {
			this.logger.info({ notice: "Create a new entity", payload });
			this.broker.broadcast("entity.created", payload);
		}
	},
	actions: {
		create(ctx) {
			const payload = ctx.params;
			// validate input
			// insert in entity-store
			this.logger.info({ notice: "Create a new entity", payload });
			// emit entity.created event
			this.broker.broadcast("entity.created", payload);
			// TODO delete following keys
			payload.sample = true;
			payload.from = "entity";
			return payload;
		},
		remove(ctx) {
			const identifier = ctx.params.id;
			// remove from entity-store
			this.logger.info({ notice: "Remove entity", id: identifier });
			// emit entity.removed event
			this.broker.broadcast("entity.removed", { id: identifier });
			return { sample: true, from: "entity", updated: true };
		},
		patch(ctx) {
			const identifier = ctx.params.id;
			const patches = ctx.params.patches;
			// validate input
			// get item from entotyt-store
			const item = {
				id: identifier,
			};
			// update item partially from entity-store
			const newItem = applyPatch(item, patches).newDocument;
			// save it back to entity-store
			this.logger.info({ notice: "Patch entity", id: identifier, patches });
			// emit entity.patched event
			this.broker.broadcast("entity.patched", { id: identifier, patches });
			newItem.sample = true;
			newItem.from = "entity";
			return newItem;
		}
	}
});

broker.start()
	.then(() => broker.logger.info("Entity service is ready"))
	.catch(err => broker.logger.error(`Error occured! ${err.message}`));
