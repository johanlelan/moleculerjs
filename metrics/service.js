"use strict";

const Tracer = require("moleculer-console-tracer");

module.exports = {
  name: "metrics",
  mixins: [Tracer],
  settings: {
    width: 100,
    gaugeWidth: 50
  },
};