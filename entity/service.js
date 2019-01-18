const _ = require("lodash");
const { applyPatch } = require("fast-json-patch");
const crypto = require("crypto");

module.exports = {
  name: "entity",
  events: {},
  actions: {
    create: {
      handler(ctx) {
        const payload = ctx.params;
        const createdEntity =  this.create(payload);
        // emit entity.created event
        this.broker.broadcast("entity.created", createdEntity);
        return createdEntity;
      }
    },
    patch: {
      async handler(ctx) {
        const id = ctx.params.id;
        const patches = ctx.params.patches;
        const entity = await this.get({ id });
        if (entity) {
          this.logger.info({ notice: "Patch entity", entity });
          // update entity partially from entity-store
          patches.push({
            op: "add",
            path: "/_timestamp",
            value: Date.now(),
          });
          const newEntity = this.patch(entity, patches);
          // emit entity.patched event
          this.broker.broadcast("entity.patched", { id, patches });
          return { ...newEntity };
        } else {
          this.logger.warn({ notice: "Unable to patch unknown entity", id });
        }
      }
    },
    remove: {
      async handler(ctx) {
        const id = ctx.params.id;
        const entity = await this.get({ id });
        if (entity) {
          this.logger.info({ notice: "Remove entity", entity });
          const disabledEntity = this.disable(entity, Date.now());
          // emit entity.removed event
          this.broker.broadcast("entity.removed", { id, timestamp: disabledEntity._timestamp });
          return { ...disabledEntity };
        } else {
          this.logger.warn({ notice: "Unable to patch unknown entity", id });
          return;
        }
      }
    },
  },
  methods: {
    /**
     * Create an entity
     * @param {Object} payload 
     * @returns {Object} created entity
     */
    create(payload) {
      // validate input
      // insert in entity-store
      payload._id = crypto.randomBytes(16).toString("hex");
      payload._active = true;
      payload._timestamp = Date.now();
      payload._type = "entity";
      this.logger.info({ notice: "Create a new entity", payload });
      return payload;
    },
    /**
     * Retrieve entity by its identifier.
     * Get all events by id and replay them on initial state
     * @param {String} id 
     */
    async get(id) {
      const events = await this.broker.call("event-store.getAllEvents", { id });
      if (_.isEmpty(events)) {
        return undefined;
      }
      const {state} = this.replay(events);
      return state;
    },
    /**
     * Apply a list of JSON patches to an entity
     * @param {Object} entity 
     * @param {Array} patches 
     * @returns patched entity
     */
    patch(entity, patches) {
      return applyPatch(entity, patches).newDocument;
    },
    /**
     * Disable the given entity
     * @param {Object} entity 
     * @returns disabled entity
     */
    disable(entity, timestamp) {
      entity._active = false;
      entity._timestamp = timestamp;
      return entity;
    },
    /**
     * The apply function is the essence of event sourcing.
     * It takes a state and an event and returns a new state
     * @param {Object} state 
     * @param {Object} event 
     * @returns {Object} new state
     */
    apply(event, state) {
      switch(event.name) {
        case "entity.created":
          state = event.data;
          break;
        case "entity.patched":
          state = this.patch(state, event.data.patches);
          break;
        case "entity.removed": 
          state = this.disable(state, event.data.timestamp);
          break;
        default:
          break;
      }
      return state;
    },
    /**
     * To recreate state from an event stream we need to replay all the events.
     * This is simply done by folding the events given an initial state.
     * The replay function takes an initial state and the event stream and returns the current state of the aggregate and its version
     * @param {Object} initState 
     * @param {Object} events 
     */
    replay(events, initState={}) {
      const newState = events.reduce((state, event) => {
        return this.apply(event, state);
      }, initState);
      return {
        state: newState,
        version: "1.0", // TODO JLL: compute aggregate version
      };
    },
    /**
     * The decide function takes the current state and a command as inputs.
     * It then decides whether the operation that the command requested can be performed at the current state by applying business rules.
     * If so it will return one or more events
     */
  },
  started() {
    this.logger.info("Entity service is ready");
  },
};
