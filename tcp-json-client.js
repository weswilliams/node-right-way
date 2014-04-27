"use strict";
const
  net = require('net'),
  json = require('./json-client.js'),
  client = net.connect({port: 5469}),
  jsonClient = json.connect(client);

jsonClient.on('message', function(message) {
  if (message.type === 'watching') {
    console.log('Now watching: ' + message.file);
  } else if (message.type === 'changed') {
    let date = new Date(message.timestamp);
    console.log('File ' + message.file + 'changed at ' + date);
  } else {
    throw Error('Unrecognized message type ' + message.type);
  }
});

jsonClient.on('error', function(err) {
  console.log('unable to read message ' + err);
});

client.on('close', function() {
  console.log('Client was closed');
});