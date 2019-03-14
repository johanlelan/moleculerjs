'use strict';

const { ServiceBroker } = require('moleculer');
const { ValidationError } = require('moleculer').Errors;
const TestService = require('../../service');

describe('Test "mapper" service', () => {
  let broker = new ServiceBroker({
    logger: false,
  });
  broker.createService(TestService);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  describe('Test "map" action', () => {
    it('should return a map JSON object', () => {
      const json = {
        reference: '67890',
        foo: {
          title: 'a single string',
        },
        bar: 4
      };
      const mapping = {
        title: {
          type: 'jsonpath',
          value: '$.foo.title',
        },
        amount: {
          type: 'constant',
          value: 1234.56
        },
        concat: {
          type: 'handlebars',
          value: '{{foo.title}} ({{reference}})',
        }
      };
      expect(broker.call('mapper.map', {json, mapping})).resolves.toEqual({
        title: json.foo.title,
        concat: `${json.foo.title} (${json.reference})`,
        amount: 1234.56,
      });
    });
    it('should return a validationError on invalid type', () => {
      const json = {};
      const mapping = {
        invalid: {
          type: 'invalid',
        },
      };
      expect(broker.call('mapper.map', {json, mapping})).rejects.toEqual(
        new ValidationError('Invalid mapping type "invalid" on key "invalid"'));
    });
    describe('Handlebars template', () => {
      it('should return a validationError on invalid template', () => {
        const json = {};
        const mapping = {
          test: {
            type: 'handlebars',
            value: null
          },
        };
        expect(broker.call('mapper.map', {json, mapping})).rejects.toEqual(
          new ValidationError('Handlebars templating error on key "test"'));
      });
    });
    it('should allow truncate helper', () => {
      const json = {
        foo: {
          title: 'a single string',
        }
      };
      const mapping = {
        test: {
          type: 'handlebars',
          value: '{{{truncate foo.title 10 }}}',
        },
      };
      expect(broker.call('mapper.map', {json, mapping})).resolves.toEqual({
        // length - 3 trailing dots
        test: 'a singl...'
      });
    });
    it('should allow truncate helper with very large length', () => {
      const json = {
        foo: {
          title: 'a single string',
        }
      };
      const mapping = {
        test: {
          type: 'handlebars',
          value: '{{{truncate foo.title }}}',
        },
      };
      expect(broker.call('mapper.map', {json, mapping})).resolves.toEqual({
        // length - 3 trailing dots
        test: json.foo.title,
      });
    });
    it('should allow truncate of undefined value', () => {
      const json = {
        foo: {
          title: 'a single string',
        }
      };
      const mapping = {
        test: {
          type: 'handlebars',
          value: '{{{truncate path.to.unknown.property 10 }}}',
        },
      };
      expect(broker.call('mapper.map', {json, mapping})).resolves.toEqual({
        test: '',
      });
    });
    it('should allow dateFormat helper', () => {
      const json = {
        dateDebut: '2019-03-14T09:27:39.654Z',
      };
      const mapping = {
        testDateFormat: {
          type: 'handlebars',
          value: '{{{dateFormat dateDebut "L" }}}',
        },
      };
      expect(broker.call('mapper.map', {json, mapping})).resolves.toEqual({
        testDateFormat: '14/03/2019',
      });
    });
  });
});


