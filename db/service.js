const { applyPatch } = require("fast-json-patch");

const records = {};

const save = (broker, logger, payload) => {
	const id = payload.id;
	records[id] = payload;
	logger.info({ notice: "Save new record", payload });
	// emit db.saved event
	broker.broadcast("db.saved", payload);
	return payload;
};

const remove = (broker, logger, id) => {
	const record = records[id];
	// remove from db
	if (record) {
		record.active = false;
	}
	logger.info({ notice: "Disable record", record });
	// emit db.removed event
	broker.broadcast("db.disabled", record);
	return { ...record, mode: "memory", from: "db" };
};

const update = (broker, logger, id, patches) => {
	// validate input
	// get record 
	const record = records[id];
	if (record) {
		// update record partially
		const newItem = applyPatch(record, patches).newDocument;
		// save it back
		logger.info({ notice: "Update record", id, patches });
		// emit db.updated event
		broker.broadcast("db.updated", { id, patches });
		records[id] = newItem;
	}
	return patches;
};

module.exports = {
	name: "db",
	events: {
		"entity.created"(payload) { // from entity
			save(this.broker, this.logger, payload);
		},
		"entity.removed"(payload) { // from entity
			remove(this.broker, this.logger, payload.id);
		},
		"entity.patched"({id, patches}) { // from entity
			update(this.broker, this.logger, id, patches);
		},
	},
	actions: {
		save(ctx) {
			const payload = ctx.params;
			return save(this.broker, this.logger, payload);
		},
		remove(ctx) {
			const identifier = ctx.params.id;
			return remove(this.broker, this.logger, identifier);
		},
		update(ctx) {
			const id = ctx.params.id;
			const patches = ctx.params.patches;
			return update(this.broker, this.logger, id, patches);
		}
	},
	started() {
		this.logger.info("DB service is ready");
	},
};
