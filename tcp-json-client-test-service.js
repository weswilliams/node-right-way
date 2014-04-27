"use strict";
const
  net = require('net'),
  server = net.createServer(function(connection) {
    console.log('subscriber connected');
    connection.write('{"type":"changed","file":"targ');
    let timer = setTimeout(function() {
      connection.write('et.txt","timestamp":1358175758495}' + '\n');
      connection.write('{type:"changed","file":"target.txt","timestamp":1358175758495}\n');
      connection.end();
    }, 1000);
    connection.on('end', function() {
      clearTimeout(timer);
      console.log('subscriber disconnected');
    });
  });
server.listen(5469, function() {
  console.log('test server listening for subscribers');
});