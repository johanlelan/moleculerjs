"use strict";
const _ = require("lodash");
const { MoleculerClientError } = require("moleculer").Errors;

const crypto 		= require("crypto");
const bcrypt 		= require("bcrypt");
const jwt 			= require("jsonwebtoken");

const userSchema = {
	username: { type: "string", min: 2, pattern: /^[a-zA-Z0-9-]+$/ },
	password: { type: "string", min: 6 },
	email: { type: "email" },
	bio: { type: "string", optional: true },
	image: { type: "string", optional: true },
};
const users = [
	{
		username: "admin",
		password: "admin",
		email: "admin@real-app.com", 
		bio: "admin system user",
	}
];

module.exports = {
	name: "user",
	mixins: [],

	/**
	 * Default settings
	 */
	settings: {
		/** Secret for JWT */
		JWT_SECRET: process.env.JWT_SECRET || "jwt-secret-key",

		/** Public fields */
		fields: ["username", "email", "bio", "image"],

		/** Validator schema for entity */
		entityValidator: userSchema,
	},

	/**
	 * Actions
	 */
	actions: {
		/**
		 * Register a new user
		 * 
		 * @actions
		 * @param {Object} user - User entity
		 * 
		 * @returns {Object} Created entity & token
		 */
		create: {
			params: {
				user: { type: "object", props: userSchema }
			},
			handler(ctx) {
				let user = ctx.params.user;
				let found = users.find(u => u.username === user.username);
				if (found) {
					return Promise.reject(new MoleculerClientError("Username already exist!", 409, "", [{ field: "username", message: "already exist"}]));
				}
				found = users.find(u => u.email === user.email);
				if (found)
					return Promise.reject(new MoleculerClientError("Email already exist!", 409, "", [{ field: "email", message: "already exist"}]));  
				user.password = bcrypt.hashSync(user.password, 10);
				user.bio = user.bio || "";
				user.image = user.image || "https://www.gravatar.com/avatar/" + crypto.createHash("md5").update(user.email).digest("hex") + "?d=identicon";
				user.createdAt = new Date();
				users.push(user);
				const publicUser = this.removePrivateProperties(user);
				this.logger.info({ notice: "new user is registered", identifier: user.username });
				// emit user.registered event
				this.broker.broadcast("user.registered", publicUser);
				// send email
				this.sendMail(ctx, user, "welcome");
				return publicUser;
			}
		},

		/**
		 * Login with username & password
		 * 
		 * @actions
		 * @param {Object} user - User credentials
		 * 
		 * @returns {Object} Logged in user with token
		 */
		login: {
			params: {
				user: { type: "object", props: {
					username: { type: "string" },
					password: { type: "string", min: 1 }
				}}
			},
			async handler(ctx) {
				const { username, password } = ctx.params.user;

				await this.Promise.resolve();
				let user = await users.find(u => u.username === username);
				if (!user) {
					this.logger.warn("username is unknown");
					return this.Promise.reject(new MoleculerClientError("login or password is invalid!", 401));
				}

				const match = await bcrypt.compare(password, user.password);
				if (!match) {
					this.logger.warn("Invalid password");
					return Promise.reject(new MoleculerClientError("login or password is invalid!", 401));
				}
							
				// Transform user entity (remove password and all protected fields)
				user = this.removePrivateProperties(user);
				const response = await this.transformEntity(user, true, ctx.meta.token);
				this.logger.info({ notice: "new user is connected", identifier: response.user.username });
				// emit user.connected event
				this.broker.broadcast("user.connected", response.user);
				return {
					token: await this.getToken(user)
				};
			}
		},

		/**
		 * Get user by JWT token (for API GW authentication)
		 * 
		 * @actions
		 * @param {String} token - JWT token
		 * 
		 * @returns {Object} Resolved user
		 */
		resolveToken: {
			cache: {
				keys: ["token"],
				ttl: 60 * 60 // 1 hour
			},			
			params: {
				token: "string"
			},
			async handler(ctx) {
				const decoded = await new this.Promise((resolve, reject) => {
					jwt.verify(ctx.params.token, this.settings.JWT_SECRET, (err, decoded) => {
						if (err)
							return reject(err);

						resolve(decoded);
					});

				});
				if (decoded.id)
					return this.getById(decoded.id);
			}
		},

		/**
		 * Update current user entity.
		 * Auth is required!
		 * 
		 * @actions
		 * 
		 * @param {Object} user - Modified fields
		 * @returns {Object} User entity
		 */
		update: {
			auth: "required",
			params: {
				user: { type: "object", props: {
					username: { type: "string", min: 2, optional: true, pattern: /^[a-zA-Z0-9]+$/ },
					password: { type: "string", min: 6, optional: true },
					email: { type: "email", optional: true },
					bio: { type: "string", optional: true },
					image: { type: "string", optional: true },
				}}
			},
			async handler(ctx) {
				const newData = ctx.params.user;
				if (newData.username) {
					const found = await users.find(u => u.username === newData.username);
					if (found && newData.username !== ctx.meta.user.username) {
						return Promise.reject(new MoleculerClientError("You must only update your account", 403));
					}
				}
				if (newData.email) {
					const found = await users.find(u => u.email === newData.email);
					if (found && newData.username !== ctx.meta.user.username) {
						return Promise.reject(new MoleculerClientError("You must only update your account", 403));
					}
				}
				newData.updatedAt = new Date();
				users.push(newData);
				const publicUser = await this.removePrivateProperties(newData);
				const response = await this.transformEntity(publicUser, true, ctx.meta.token);
				this.logger.info({ notice: "user have been updated", identifier: response.user.username });
				// emit user.connected event
				this.broker.broadcast("user.updated", response.user);
				return response.user;
			}
		},

		/**
		 * Register a new user
		 * 
		 * @actions
		 * @param {Object} user - User entity
		 * 
		 * @returns {Object} Created entity & token
		 */
		remove: {
			params: {
				id: "string"
			},
			handler(ctx) {
				const id = ctx.params.id;
				const user = users.find(u => u.username = id);
				if (!user) return;
				this.logger.info({ notice: "Remove user", id });
				// TODO implement some business logic here
				user._active = false;
				// emit user.removed event
				this.broker.broadcast("user.removed", { id });
				const publicUser = this.removePrivateProperties(user);
				return { ...publicUser };
			}
		},
    
		/**
		 * Activate a new user
		 * 
		 * @actions
		 * @param {string} id - User identifier
		 * 
		 * @returns {Object} Activated user
		 */
		activate: {
			params: {
				id: "string"
			},
			handler(ctx) {
				const id = ctx.params.id;
				const user = users.find(u => u.username = id);
				if (!user) return;
				this.logger.info({ notice: "Activate user", id });
				// TODO implement some business logic here
				user._active = true;
				// emit user.activated event
				this.broker.broadcast("user.activated", { id });
				const publicUser = this.removePrivateProperties(user);
				return { ...publicUser };
			}
		},
	},

	/**
	 * Methods
	 */
	methods: {
		async getToken(user) {
			return await this.generateJWT({ ...user });
		},
		/**
		 * Generate a JWT token from user entity
		 * 
		 * @param {Object} user 
		 */
		generateJWT(user) {
			const today = new Date();
			const exp = new Date(today);
			exp.setDate(today.getDate() + 60);

			return jwt.sign({
				sub: user.username,
				username: user.username,
				exp: Math.floor(exp.getTime() / 1000)
			}, this.settings.JWT_SECRET);
		},

		/**
		 * Transform returned user entity. Generate JWT token if neccessary.
		 * 
		 * @param {Object} user 
		 * @param {Boolean} withToken 
		 */
		validateEntity(user) {
			return { user };
		},

		/**
		 * Transform returned user entity. Generate JWT token if neccessary.
		 * 
		 * @param {Object} user 
		 * @param {Boolean} withToken 
		 */
		transformEntity(user, withToken, token) {
			if (user) {
				if (withToken)
					user.token = token || this.generateJWT(user);
			}
			return { user };
		},
		/**
     * Remove password and protected fields
     * 
     * @param {Context} ctx 
     * @param {Object} param1 
     * @param {Object} user 
     */
		removePrivateProperties(user) {
			return {
				_id: user.username,
				username: user.username,
				email: user.email,
				bio: user.bio,
				image: user.image,
			};
		},
		/**
     * Find user with this username
     * 
     * @param {string} username 
     */
		getById(username) {
			return users.find(u => username === u.username);
		},
		/**
		 * Send email to the user email address
		 *
		 * @param {Context} ctx
		 * @param {Object} user
		 * @param {String} template
		 * @param {Object?} data
		 */
		async sendMail(ctx, user, template, data) {
			try {
				return await ctx.call("mail.send", {
					to: user.email,
					template,
					data: {...data, user}
				}, { retries: 3, timeout: 5000 });

			} catch(err) {
				/* istanbul ignore next */
				this.logger.error("Send mail error!", err);
				/* istanbul ignore next */
				throw err;
			}
		},
	},

	events: {}
};