"use strict";

const { MoleculerClientError } = require("moleculer").Errors;

const crypto 		= require("crypto");
const bcrypt 		= require("bcrypt");
const jwt 			= require("jsonwebtoken");

const userSchema = {
	username: { type: "string", min: 2, pattern: /^[a-zA-Z0-9\-]+$/ },
	password: { type: "string", min: 6 },
	email: { type: "email" },
	bio: { type: "string", optional: true },
	image: { type: "string", optional: true },
};
const users = [];

module.exports = {
	name: "user",
	mixins: [],

	/**
	 * Default settings
	 */
	settings: {
		/** Secret for JWT */
		JWT_SECRET: process.env.JWT_SECRET || "jwt-conduit-secret",

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
				const publicUser = this.removePrivateProperties(ctx, {}, user);
				this.logger.info({ notice: "new user is registered", identifier: user.username });
				// emit user.registered event
				this.broker.broadcast("user.registered", publicUser);
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
			handler(ctx) {
				const { username, password } = ctx.params.user;

				return this.Promise.resolve()
					.then(() => users.find(u => u.username === username))
					.then(user => {
						if (!user) {
							this.logger.warn("username is unknown");
							return this.Promise.reject(new MoleculerClientError("login or password is invalid!", 401));
						}

						return bcrypt.compare(password, user.password).then(res => {
							if (!res) {
								this.logger.warn("Invalid password");
								return Promise.reject(new MoleculerClientError("login or password is invalid!", 401));
							}
							
							// Transform user entity (remove password and all protected fields)
							return this.removePrivateProperties(ctx, {}, user);
						})
							.then(user => this.transformEntity(user, true, ctx.meta.token))
							.then(response => {
								this.logger.info({ notice: "new user is connected", identifier: response.user.username });
								// emit user.connected event
								this.broker.broadcast("user.connected", response.user);
								return user;
							});
					});
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
			handler(ctx) {
				return new this.Promise((resolve, reject) => {
					jwt.verify(ctx.params.token, this.settings.JWT_SECRET, (err, decoded) => {
						if (err)
							return reject(err);

						resolve(decoded);
					});

				})
					.then(decoded => {
						if (decoded.id)
							return this.getById(decoded.id);
					});
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
			handler(ctx) {
				const newData = ctx.params.user;
				return this.Promise.resolve()
					.then(() => {
						if (newData.username)
							return users.find(u => u.username === newData.username)
								.then(found => {
									if (found && newData.username !== ctx.meta.user.username)
										return Promise.reject(new MoleculerClientError("You must only update your account", 403));
								});
					})
					.then(() => {
						if (newData.email)
							return users.find(u => u.email === newData.email)
								.then(found => {
									if (found && newData.username !== ctx.meta.user.username)
										return Promise.reject(new MoleculerClientError("You must only update your account", 403));
								});
					})
					.then(() => {
						newData.updatedAt = new Date();
						users.push(newData);
						return newData;
					})
					.then(doc => this.removePrivateProperties(ctx, {}, doc))
					.then(user => this.transformEntity(user, true, ctx.meta.token))
					.then(response => {
						this.logger.info({ notice: "user have been updated", identifier: response.user.username });
						// emit user.connected event
						this.broker.broadcast("user.updated", response.user);
						return response.user;
					});

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
				user.active = false;
				// emit user.removed event
				this.broker.broadcast("user.removed", { id });
				const publicUser = this.removePrivateProperties(ctx, {}, user);
				return { ...publicUser, mode: "memory", from: "user" };
			}
		},

		/**
		 * Get a user profile.
		 * 
		 * @actions
		 * 
		 * @param {String} username - Username
		 * @returns {Object} User entity
		 */
		profile: {
			cache: {
				keys: ["#token", "username"]
			},
			params: {
				username: { type: "string" }
			},
			handler(ctx) {
				return users.find(u => u.username === newData.username)
					.then(user => {
						if (!user)
							return this.Promise.reject(new MoleculerClientError("User not found!", 404));

						return this.removePrivateProperties(ctx, {}, user);
					})
					.then(user => this.transformProfile(ctx, user, ctx.meta.user));
			}
		},

		/**
		 * Follow a user
		 * Auth is required!
		 * 
		 * @actions
		 * 
		 * @param {String} username - Followed username
		 * @returns {Object} Current user entity
		 */
		follow: {
			auth: "required",
			params: {
				username: { type: "string" }
			},
			handler(ctx) {
				return users.find(u => u.username === newData.username)
					.then(user => {
						if (!user)
							return this.Promise.reject(new MoleculerClientError("User not found!", 404));

						return ctx.call("follows.add", { user: ctx.meta.user.username.toString(), follow: user.username.toString() })
							.then(() => this.removePrivateProperties(ctx, {}, user));
					})
					.then(user => this.transformProfile(ctx, user, ctx.meta.user));
			}
		},	

		/**
		 * Unfollow a user
		 * Auth is required!
		 * 
		 * @actions
		 * 
		 * @param {String} username - Unfollowed username
		 * @returns {Object} Current user entity
		 */
		unfollow: {
			auth: "required",
			params: {
				username: { type: "string" }
			},
			handler(ctx) {
				return users.find(u => u.username === newData.username)
					.then(user => {
						if (!user)
							return this.Promise.reject(new MoleculerClientError("User not found!", 404));

						return ctx.call("follows.delete", { user: ctx.meta.user.username.toString(), follow: user.username.toString() })
							.then(() => this.removePrivateProperties(ctx, {}, user));
					})
					.then(user => this.transformProfile(ctx, user, ctx.meta.user));
			}
		}		
	},

	/**
	 * Methods
	 */
	methods: {
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
				id: user.username,
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
		 * Transform returned user entity as profile.
		 * 
		 * @param {Context} ctx
		 * @param {Object} user 
		 * @param {Object?} loggedInUser 
		 */
		transformProfile(ctx, user, loggedInUser) {
			//user.image = user.image || "https://www.gravatar.com/avatar/" + crypto.createHash("md5").update(user.email).digest("hex") + "?d=identicon";
			user.image = user.image || "https://static.productionready.io/images/smiley-cyrus.jpg";

			if (loggedInUser) {
				return ctx.call("follows.has", { user: loggedInUser.username.toString(), follow: user.username.toString() })
					.then(res => {
						user.following = res;
						return { profile: user };
					});
			}

			user.following = false;

			return { profile: user };
		},
		/**
     * Remove password and protected fields
     * 
     * @param {Context} ctx 
     * @param {Object} param1 
     * @param {Object} user 
     */
		removePrivateProperties(ctx, {}, user) {
			return {
				id: user.username,
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
	},

	events: {
		"cache.clean.users"() {
			if (this.broker.cacher)
				this.broker.cacher.clean(`${this.name}.*`);
		},
		"cache.clean.follows"() {
			if (this.broker.cacher)
				this.broker.cacher.clean(`${this.name}.*`);
		}
	}	
};