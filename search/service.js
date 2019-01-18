const _ = require("lodash");
const ESService 			= require("moleculer-elasticsearch");

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
  mixins: [ESService],
  settings: {
    elasticsearch: {
      host: process.env.ELASTIC_URL || "http://localhost:9200"
    }
  },
  methods: {
    async index(type, payload) {
      const id = payload._id;
      const body = payload;
      body.id = id;
      delete body._id;
      return await this.broker.call("search.create", {
        index: type,
        type: "default",
        id,
        body,
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
      documents[payload.id] = payload;
      await this.index("entity", payload);
      this.logger.info({ notice: "Index item", payload });
      this.broker.broadcast("search.indexed", payload);
    },
    async "entity.removed"(payload) {
      const document = documents[payload.id];
      await this.index("entity", payload);
      if (document) {
        document._active = false;
        this.logger.info({ notice: "Unindex item", id: payload.id });
        this.broker.broadcast("search.unindexed", payload.id);
      }
    },
    async "entity.patched"({ id, entity }) {
      documents[id] = entity;
      await this.index("entity", entity);
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
    async "user.registered"(user) {
      users[user.username] = user;
      await this.index("user", user);
      this.logger.info({ notice: "Index user", user });
      this.broker.broadcast("search.user.indexed", user);
    },
    async "user.removed"(payload) {
      const user = users[payload.id];
      if (user) {
        await this.index("user", payload);
        user._active = false;
        this.logger.info({ notice: "Unindex user", id: payload.id });
        this.broker.broadcast("search.user.unindexed", payload.id);
      }
    },
    async "user.activated"(payload) {
      const user = users[payload.id];
      if (user) {
        await this.index("user", payload);
        user._active = true;
        this.logger.info({ notice: "Reindex user", id: payload.id });
        this.broker.broadcast("search.user.indexed", payload.id);
      }
    }
  },
  actions: {
    async list(ctx) {
      const payload = ctx.params.query;
      const type = ctx.params.type;
      const collection = getCollection(type);
      // validate input
      // filter search engine
      const res = await this.find(collection, payload);
      const data = _.get(res, "hits.hits", []);
      this.logger.info({ notice: `list all matching ${type}`, payload });
      // emit search.query event
      this.broker.broadcast("search.query", payload);
      //const data = Object.values(collection).filter(item => item._active !== false);
      // TODO JLL: need to manage pagination
      return { 
        _type: type,
        total: res.hits.total,
        data: data.map(d=>d._source),
      };
    },
    async getById(ctx) {
      const id = ctx.params.id;
      const type = ctx.params.type;
      // get from search engine by identifier
      const collection = getCollection(type);
      const documents = await this.find(collection, {
        match: { id }
      });
      const document = _.get(documents, "0._source");
      //const document = collection[id];
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