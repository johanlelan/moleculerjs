// simple proxy for entity items
const toArray = require('lodash.values');
const safeGet = require('lodash.get');

module.exports = {
  name: 'users',
  openapi: {
    // https://swagger.io/specification/#componentsObject
    components: {
      schemas: {
        User: {
          required: ['username', 'email', 'password'],
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Test board' },
            description: { type: 'string', example: 'Test board description' },
            username: { type: 'string', min: 2, pattern: /^[a-zA-Z0-9-]+$/ },
            password: { type: 'string', min: 6 },
            email: { type: 'email' },
            bio: { type: 'string', optional: true },
            image: { type: 'string', optional: true },
          }
        },
        Users: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/User'
          }
        },
        UserList: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 50 },
            type: { type: 'string', example: 'user' },
            data: {
              $ref: '#/components/schemas/Users'
            }
          }
        }
      }
    },
  },
  actions: {
    login: {
      async handler(ctx) {
        const res = await ctx.broker.call('user.login', ctx.params);
        ctx.meta.$statusCode = 200;
        return res;
      }
    },
    register: {
      async handler(ctx) {
        const res = await ctx.broker.call('user.create', ctx.params, { requestID: ctx.requestID,
          meta: { headers: safeGet(ctx, 'options.parentCtx.params.req.headers', {})}});
        ctx.meta.$statusCode = 201;
        ctx.meta.$responseHeaders = {
          'Location': `/api/v1/users/${res.id}`,
        };
        return res;
      }
    },
    list(ctx) {
      return ctx.broker.call('search.list', { ...ctx.params, type: 'user' });
    },
    get: {
      params: {
        id: 'string'
      },
      async handler(ctx) {
        const res = await ctx.broker.call('search.get', { id: ctx.params.id, type: 'user' });
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
        const user = await this.broker.call('search.get', { id, type: 'user' });
        if (!user) {
          // Not found
          ctx.meta.$statusCode = 404;
          return;
        } else if (user._active === false) {
          // Gone
          ctx.meta.$statusCode = 410;
          return user;
        }
        const patches = toArray(ctx.params);
        const res = this.broker.call('user.update', { user, patches });
        return res;
      }
    },
    remove: {
      params: {
        id: 'string'
      },
      async handler(ctx) {
        const res = await ctx.broker.call('user.remove', { id: ctx.params.id });
        ctx.meta.$statusCode = 204;
        return res;
      }
    },
    activate: {
      params: {
        id: 'string'
      },
      async handler(ctx) {
        const res = await ctx.broker.call('user.activate', { id: ctx.params.id });
        ctx.meta.$statusCode = 204;
        return res;
      }
    }
  },
  methods: {
  }
};