"use strict";
const pick = require("lodash.pick");

const ApiGateway = require("moleculer-web");
const { UnAuthorizedError } = ApiGateway.Errors;
const compression	= require("compression");

module.exports = {
	name: "api",
	mixins: [ApiGateway],

	// More info about settings: https://moleculer.services/docs/0.13/moleculer-web.html
	settings: {
		port: process.env.PORT || 3000,

		routes: [{
			path: "/api",
			authentication: true,
			authorization: true,
			use: [
				compression(),
			],
			cors: true,
			bodyParsers: {
				json: {
					strict: false
				},
				urlencoded: {
					extended: false
				}
			},
			whitelist: [
				// Access to any actions in all services under "/api" URL
				"**"
			],
			mappingPolicy: "restrict",
			aliases: {
				// Login
				"POST /users/login": "users.login",
				// Users
				"GET /users": "users.list",
				"POST /users": "users.register",
				"GET /users/:id": "users.get",
				"PATCH /users/:id": "users.patch",
				"DELETE /users/:id": "users.remove",
        
				// items
				"GET items": "items.list",
				"GET items/:id": "items.get",
				"POST items": "items.create",
				"PATCH items/:id": "items.patch",
				"DELETE items/:id": "items.remove"
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
		authorize(ctx, route, req) {
			let token;
			if (req.headers.authorization) {
				let type = req.headers.authorization.split(" ")[0];
				if (type === "Token" || type === "Bearer")
					token = req.headers.authorization.split(" ")[1];
			}

			return this.Promise.resolve(token)
				.then(token => {
					if (token) {
						// Verify JWT token
						return ctx.call("users.resolveToken", { token })
							.then(user => {
								if (user) {
									this.logger.info("Authenticated via JWT: ", user.username);
									// Reduce user fields (it will be transferred to other nodes)
									ctx.meta.user = pick(user, ["_id", "username", "email", "image"]);
									ctx.meta.token = token;
								}
								return user;
							})
							.catch(err => {
								// Ignored because we continue processing if user is not exist
								return null;
							});
					}
				})
				.then(user => {
					if (req.$endpoint.action.auth == "required" && !user)
						return this.Promise.reject(new UnAuthorizedError());
				});
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
			let accessToken = req.query["access_token"];
			if (accessToken) {
				if (accessToken === "12345") {
					return Promise.resolve({ id: 1, username: "john.doe", name: "John Doe" });
				} else {
					return Promise.reject({ message: "Invalid access_token" });
				}
			} else {
				return Promise.reject({ message: "You must specified an access_token query param" });
			}
		}
	}
};
