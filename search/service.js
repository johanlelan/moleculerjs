const _ = require("lodash");
const ESService = require("moleculer-elasticsearch");

module.exports = {
  name: "search",
  mixins: [ESService],
  methods: {
    async index(type, payload) {
      const newElement = { ...payload };
      const id = newElement._id;
      delete newElement._id;
      const body = newElement;
      body.id = id;
      return await this.broker.call("search.create", {
        index: type,
        type: "default",
        id,
        body,
      });
    },
    async delete(type, id) {
      return await this.broker.call("search.delete", {
        index: type,
        type: "default",
        id,
      });
    },
    async find(type, query) {
      return await this.broker.call("search.search", { 
        body: {
          query,
        } 
      });
    }
  },
  events: {
    async "entity.created"(payload) {
      await this.index("entity", payload);
      this.logger.info({ notice: "Index item", payload });
      this.broker.broadcast("search.entity.indexed", payload);
    },
    async "entity.disabled"(payload) {
      await this.index("entity", payload);
      this.logger.info({ notice: "disable item", id: payload._id });
      this.broker.broadcast("search.entity.disabled", payload._id);
    },
    async "entity.removed"(payload) {
      await this.delete("entity", payload._id);
      this.logger.info({ notice: "Unindex item", id: payload._id });
      this.broker.broadcast("search.entity.unindexed", payload._id);
    },
    async "entity.patched"(payload) {
      await this.index("entity", payload);
      this.logger.info({ notice: "Index item", payload });
      this.broker.broadcast("search.entity.indexed", payload);
    },
    async "user.connected"(user) {
      const jwtFragments = user.token.split(".");
      if (jwtFragments.length === 3) {
        const payload = JSON.parse(new Buffer(jwtFragments[1], "base64").toString("utf-8"));
        const time = payload.exp * 1000 - (new Date()).getTime();
        payload._id = user.username;
        await this.index("user", payload);
        this.logger.info({ notice: "Index connected user", user });
        this.broker.broadcast("search.user.connected.indexed", { _id : user.username });
        setTimeout(async () => {
          // remove connected user after jwt expiration period
          await this.delete("user", user.username);
          this.broker.broadcast("search.user.connected.unindexed", payload._id);
        }, time);
      }
    },
    async "user.registered"(user) {
      await this.index("user", user);
      this.logger.info({ notice: "Index user", user });
      this.broker.broadcast("search.user.indexed", user);
    },
    async "user.removed"(payload) {
      await this.delete("user", payload._id);
      this.logger.info({ notice: "Unindex user", id: payload._id });
      this.broker.broadcast("search.user.unindexed", payload._id);
    },

    async "user.disabled"(payload) {
      await this.index("user", payload);
      this.logger.info({ notice: "disable user", id: payload._id });
      this.broker.broadcast("search.user.disabled", payload._id);
    },
    async "user.activated"(payload) {
      await this.index("user", payload);
      this.logger.info({ notice: "Index user", user: payload });
      this.broker.broadcast("search.user.indexed", payload);
    }
  },
  actions: {
    async list(ctx) {
      const payload = ctx.params.query;
      const type = ctx.params.type;
      // validate input
      // filter search engine
      const res = await this.find(type, payload);
      const data = _.get(res, "hits.hits", []);
      this.logger.info({ notice: `list all matching ${type}`, payload });
      const result = {
        _type: type,
        total: res.hits.total,
        data: data.map(d=>d._source),
      };
      // emit search.queried event
      this.broker.broadcast("search.queried", result);
      return result;
    },
    async getById(ctx) {
      const id = ctx.params.id;
      const type = ctx.params.type;
      const result = await this.find(type, {
        match: { id }
      });
      const document = _.get(result, "hits.hits.0._source");
      //const document = collection[id];
      if (!document) {
        this.broker.broadcast("search.notFound", {
          id
        });
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
    this.logger.info("search service is ready");
  },
};