"use strict";
const
  events = require('events'),
  util = require('util'),
  LineClient = function(stream) {
    events.EventEmitter.call(this);
    let
      self = this,
      buffer = '';
    stream.on('data', function(data) {
      buffer +=  data;
      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        let input = buffer.substr(0, boundary);
        buffer = buffer.substr(boundary + 1);
        self.emit('line', input);
        boundary = buffer.indexOf('\n');
      }
    });
  };
util.inherits(LineClient, events.EventEmitter);
exports.LineClient = LineClient;