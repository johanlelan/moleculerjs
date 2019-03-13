'use strict';
const pick = require('lodash.pick');
const ApiGateway = require('moleculer-web');
const compression	= require('compression');
const helmet 			= require('helmet');

const OpenApiMixin 		= require('../mixins/openapi.mixin');

const { UnAuthorizedError } = ApiGateway.Errors;

module.exports = {
  name: 'home',
  mixins: [
    ApiGateway,
  ],
  // More info about settings: https://moleculer.services/docs/0.13/moleculer-web.html
  settings: {
    port: process.env.PORT || 3000,
    use: [
      helmet(),
    ],
    routes: [
      {
        path: '/',
        aliases: {
          // API Home
          'GET /': 'home.welcome',
        }
      },
    ],
  },
  actions: {
    welcome: {
      async handler(ctx) {
        ctx.meta.$statusCode = 200;
        return {
          welcome: 'to sample API',
          todos: [
            'add links to endpoints',
            'add services infrastructure',
            'add services version',
          ]
        };
      },
    }
  },
  methods: {
  },
};
