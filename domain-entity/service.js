const { applyPatch } = require("fast-json-patch");
const uuid = require("uuid/v1");

const create = (broker, logger, payload) => {
	const id = uuid();
	// validate input
	// insert in entity-store
	payload.from = "entity";
	payload.id = id;
	payload.active = true;
	payload.timestamp = Date.now();
	logger.info({ notice: "Create a new entity", payload });
	// emit entity.created event
	broker.broadcast("entity.created", payload);
	return payload;
};

module.exports = {
	name: "entity",
	events: {
		"item.requested"(payload) { // from api-gateway
			create(this.broker, this.logger, payload);
		},
	},
	actions: {
		create(ctx) {
			const payload = ctx.params;
			return create(this.broker, this.logger, payload);
		},
		remove(ctx) {
			const id = ctx.params.id;
			return this.broker.call("search.get", { id })
				.then(entity => {
					if (entity) {
						this.logger.info({ notice: "Remove entity", entity });
						// TODO implement some business logic here
						entity.active = false;
						// emit entity.removed event
						this.broker.broadcast("entity.removed", entity);
						return { ...entity, mode: "memory", from: "entity" };
					} else {
						this.logger.warn({ notice: "Unable to patch unknown entity", id });
					}
				});
		},
		patch(ctx) {
			const id = ctx.params.id;
			const patches = ctx.params.patches;
			return this.broker.call("search.get", { id })
				.then(entity => {
					if (entity) {
						this.logger.info({ notice: "Patch entity", entity });
						// update entity partially from entity-store
						const newEntity = applyPatch(entity, patches).newDocument;
						// emit entity.patched event
						this.broker.broadcast("entity.patched", { id, patches, entity: newEntity });
						return { ...newEntity, mode: "memory", from: "entity" };
					} else {
						this.logger.warn({ notice: "Unable to patch unknown entity", id });
					}
				});
		}
	},
	started() {
		this.logger.info("Entity service is ready");
	},
};
