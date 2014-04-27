'use strict';
const
  events = require('events'),
  util = require('util'),
  LineClient = require('./ldj.js').LineClient,
  JSONClient = function(lineClient) {
  events.EventEmitter.call(this);
  let self = this;
  lineClient.on('line', function(line) {
    try {
      self.emit('message', JSON.parse(line));
    } catch (err) {
      self.emit('error', 'poorly formed JSON in message: ' + line);
    }
  });
};
util.inherits(JSONClient, events.EventEmitter);
exports.JSONClient = JSONClient;
exports.connect = function(stream) {
  return new JSONClient(new LineClient(stream));
};
