// simple proxy for entity items
const toArray = require('lodash.values');

module.exports = {
  name: 'items',
  openapi: {
    // https://swagger.io/specification/#componentsObject
    components: {
      schemas: {
        Item: {
          required: ['title'],
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Test board' },
            description: { type: 'string', example: 'Test board description' },
          }
        },
        Items: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Item'
          }
        },
        ItemList: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 50 },
            type: { type: 'string', example: 'item' },
            data: {
              $ref: '#/components/schemas/Items'
            }
          }
        }
      }
    },
  },
  actions: {
    create: {
      async handler(ctx) {
        const res = await ctx.broker.call('entity.create', ctx.params);
        ctx.meta.$statusCode = 201;
        ctx.meta.$responseHeaders = {
          'Location': `/api/v1/items/${res._id}`,
        };
        return res;
      }
    },
    list(ctx) {
      return ctx.broker.call('search.list', { ...ctx.params, type: 'items' });
    },
    get: {
      params: {
        id: 'string'
      },
      async handler(ctx) {
        let res = undefined;
        try {
          // try from search engine
          res = await ctx.broker.call('search.get', { id: ctx.params.id, type: 'items' });
        } catch(err) {
          // try from event-store
          res = await ctx.broker.call('event-store.getAllEvents', { id: ctx.params.id, aggregate: 'items' });
        }
        if (!res) {
          // Not found
          ctx.meta.$statusCode = 404;
        } else if (res._active === false) {
          // Gone
          ctx.meta.$statusCode = 410;
        }
        return res;
      }
    },
    patch: {
      params: {
        id: 'string',
      },
      async handler(ctx) {
        const id = ctx.params.id;
        delete ctx.params.id;
        // check if entity exists
        const item = await this.broker.call('search.get', { id, type: 'items' });
        if (!item || item._active === false) {
          ctx.meta.$statusCode = 404;
          return null;
        }
        const patches = toArray(ctx.params);
        return ctx.broker.call('entity.patch', { id, patches });
      }
    },
    remove: {
      params: {
        id: 'string'
      },
      async handler(ctx) {
        const res = await ctx.broker.call('entity.remove', { id: ctx.params.id });
        ctx.meta.$statusCode = 204;
        return res;
      }
    }
  }
};