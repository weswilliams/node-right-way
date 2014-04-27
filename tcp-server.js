"use strict";
const
  fs = require('fs'),
  net = require('net'),
  filename = process.argv[2],
  watcher = fs.watch(filename),
  server = net.createServer(function (connection) {
    console.log("Subscriber from " + connection.address().address);
    connection.write(JSON.stringify({type: 'watching', file: filename}) + '\n');
    let listener = function () {
      connection.write(JSON.stringify({type: 'changed', file: filename,
        timestamp: Date.now()}) + '\n');
    };
    watcher.on('change', listener);
    connection.on('close', function () {
      console.log('Subscriber gone!');
      watcher.removeListener('change', listener);
    });
  });
server.on('error', function (err) {
  console.log("server error: " + err);
});
process.on('SIGINT', function() {
  console.log('shutting server down and stop watching file');
  watcher.close();
  server.close();
  process.exit();
});
server.listen(5469, function() {
  console.log('listening for subscribers...');
});