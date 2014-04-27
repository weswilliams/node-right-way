"use strict";
const
  fs = require('fs'),
  net = require('net'),
  filename = process.argv[2],
  server = net.createServer(function (connection) {
    console.log("Subscriber connected ...");
    connection.write('Watching file ' + filename + "... \n");
    let watcher = fs.watch(filename, function () {
      connection.write(filename + ' changed at ' + Date.now() + "\n");
    });
    connection.on('close', function () {
      console.log('Subscriber gone!');
      watcher.close();
    })
  });
server.on('error', function (err) {
  console.log("server error: " + err);
});
server.listen('/tmp/watcher.sock', function() {
  console.log('listening for subscribers...');
});