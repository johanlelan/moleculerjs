"use strict";
const pick = require("lodash.pick");
const ApiGateway = require("moleculer-web");
const compression	= require("compression");
const helmet 			= require("helmet");

const OpenApiMixin 		= require("../mixins/openapi.mixin");

const { UnAuthorizedError } = ApiGateway.Errors;

module.exports = {
	name: "api",
	mixins: [
		ApiGateway,
		OpenApiMixin(),
	],
	// More info about settings: https://moleculer.services/docs/0.13/moleculer-web.html
	settings: {
		port: process.env.PORT || 3000,

		use: [
			helmet(),
		],

		routes: [{
			path: "/api/v1",
			authentication: true,
			authorization: true,
			etag: true,
			use: [
				compression(),
			],
			cors: true,
			bodyParsers: {
				json: {
					strict: false,
					limit: "1MB",
				},
				urlencoded: {
					extended: false,
					limit: "1MB",
				}
			},
			whitelist: [
				// Access to any actions in all services under "/api" URL
				"**"
			],
			mappingPolicy: "restrict",
			aliases: {
				// Login
				"POST /login": "users.login",
				// Users
				"POST /users": "users.register",
				"GET /users": "users.list",
				"GET /users/:id": "users.get",
				"PATCH /users/:id": "users.patch",
				"DELETE /users/:id": "users.remove",
				// Activate
				"POST /users/:id/activate": "users.activate",
        
				// items
				"GET /items": "items.list",
				"POST /items": "items.create",
				"PATCH /items/:id": "items.patch",
				"DELETE /items/:id": "items.remove",
				"GET /items/:id": "items.get",
			},
			callOptions: {
				timeout: (process.env.NODE_ENV === "production" ? 500 : 5000),
				retryCount: 2,
			},
			rateLimit: {
				// How long to keep record of requests in memory (in milliseconds). 
				// Defaults to 60000 (1 min)
				window: 60 * 1000,

				// Max number of requests during window. Defaults to 30
				limit: 30,
        
				// Set rate limit headers to response. Defaults to false
				headers: true,

				// Function used to generate keys. Defaults to: 
				key: (req) => {
					return req.headers["x-forwarded-for"] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress;
				},
				//StoreFactory: CustomStore
			}
		}],

		// Serve assets from "public" folder
		assets: {
			folder: "public",
			options: {},
		},
		onError(req, res, err) {
			// Return with the error as JSON object
			res.setHeader("Content-type", "application/json; charset=utf-8");
			res.writeHead(err.code || 500);

			if (err.code == 422) {
				let o = {};
				err.data.forEach(e => {
					let field = e.field.split(".").pop();
					o[field] = e.message;
				});

				res.end(JSON.stringify({ errors: o }, null, 2));				
			} else {
				const errObj = pick(err, ["name", "message", "code", "type", "data"]);
				res.end(JSON.stringify(errObj, null, 2));
			}
			this.logResponse(req, res, err? err.ctx : null);
		}
	},
	methods: {
		/**
		 * Authorize the request
		 *
		 * @param {Context} ctx
		 * @param {Object} route
		 * @param {IncomingRequest} req
		 * @returns {Promise}
		 */
		async authorize(ctx, route, req) {
			let token;
			if (req.headers.authorization) {
				let type = req.headers.authorization.split(" ")[0];
				if (type === "Token" || type === "Bearer")
					token = req.headers.authorization.split(" ")[1];
			}

			token = await this.Promise.resolve(token);
			if (token) {
				try {
					// Verify JWT token
					const user = await ctx.call("users.resolveToken", { token });
					if (user) {
						this.logger.info("Authenticated via JWT: ", user.username);
						// Reduce user fields (it will be transferred to other nodes)
						ctx.meta.user = pick(user, ["_id", "username", "email", "image"]);
						ctx.meta.token = token;
					}
					if (req.$endpoint.action.auth == "required" && !user) {
						return this.Promise.reject(new UnAuthorizedError());
					}
				}
				catch(err) {
					// Ignored because we continue processing if user is not exist
					return null;
				}
			}
		},
		/**
		 * Authenticate the user from request
		 * 
		 * @param {Context} ctx 
		 * @param {Object} route
		 * @param {IncomingMessage} req 
		 * @param {ServerResponse} res 
		 * @returns 
		 */
		authenticate(ctx, route, req, res) {
			// TODO implement jwt authentication
			return Promise.resolve({ id: 1, username: "anonymous", name: "anonymous user" });
			/*
      let token;

			// Get JWT token from cookie
			if (req.headers.cookie) {
				const cookies = cookie.parse(req.headers.cookie);
				token = cookies["jwt-token"];
			}

			// Get JWT token from Authorization header
			if (!token) {
				const auth = req.headers["authorization"];
				if (auth && auth.startsWith("Bearer "))
					token = auth.slice(7);
			}

			ctx.meta.roles = [C.ROLE_EVERYONE];

			if (token) {
				// Verify JWT token
				const user = await ctx.call("v1.accounts.resolveToken", { token });
				if (user) {
					this.logger.info("User authenticated via JWT.", { username: user.username, email: user.email });

					ctx.meta.roles.push(C.ROLE_AUTHENTICATED);
					if (Array.isArray(user.roles))
						ctx.meta.roles.push(...user.roles);
					ctx.meta.token = token;
					ctx.meta.userID = user.username;
					// Reduce user fields (it will be transferred to other nodes)
					return pick(user, ["email", "username", "firstName", "lastName", "avatar"]);
				}
				return null;
			}

			//return this.Promise.reject(new UnAuthorizedError());
      */
		},
		async signInSocialUser(params, cb) {
			try {
				cb(null, await this.broker.call("v1.accounts.socialLogin", params));
			} catch(err) {
				cb(err);
			}
		},
	}
};
