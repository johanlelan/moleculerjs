'use strict';
const { ValidationError } = require('moleculer').Errors;
const jsonpath = require('jsonpath');
const Handlebars = require('handlebars');

// Helpers - Handlebars
const handlebarsHelpers = require('./lib/handlebars-helpers');

Handlebars.registerHelper('dateFormat', handlebarsHelpers.dateFormat);
Handlebars.registerHelper('truncate', handlebarsHelpers.truncate);
Handlebars.registerHelper('ifeq', handlebarsHelpers.ifeq);


module.exports = {
  name: 'mapper',

  /**
   * Service settings
   */
  settings: {

  },

  /**
   * Service dependencies
   */
  //dependencies: [],  

  /**
   * Actions
   */
  actions: {
    map: {
      params: {
        json: 'object',
        mapping: 'object',
      },
      async handler(ctx){
        return await this.map(ctx.params.json, ctx.params.mapping);
      },
    }
  },

  /**
   * Events
   */
  events: {

  },

  /**
   * Methods
   */
  methods: {
    async map(json, mapping) {
      // get all map entries
      const mapKeys = Object.keys(mapping);
      // prepare the result context
      const context = {};
      return new Promise((resolve, reject) => {
        mapKeys.forEach(key => {
          const mapValue = mapping[key];
          switch(mapValue.type) {
            case 'constant': // constant value
              context[key] = mapValue.value;
              break;
            case 'jsonpath': // jsonpath
              context[key] = jsonpath.value(json, mapValue.value);
              break;
            case 'handlebars': // handlebars
              try {
                const template = Handlebars.compile(mapValue.value);
                context[key] = template(json);
              } catch(e) {
                reject(new ValidationError(`Handlebars templating error on key "${key}"`, e));
              }
              break;
            default: // unknown type
              reject(new ValidationError(`Invalid mapping type "${mapValue.type}" on key "${key}"`));
          }
        });
        resolve(context);
      });
    },
  },

  /**
   * Service created lifecycle event handler
   */
  created() {

  },

  /**
   * Service started lifecycle event handler
   */
  started() {

  },

  /**
   * Service stopped lifecycle event handler
   */
  stopped() {

  }  
};