'use strict';
const
  zmq = require('zmq'),
  filename = process.argv[2],
  requester = zmq.socket('req');

requester.on('message', function(data) {
  let response = JSON.parse(data);
  console.log('received response: ' + data);
});

requester.connect('tcp://localhost:5469');
console.log('sending request for ' + filename);
for(let i = 0; i < 3; i++) {
  requester.send(JSON.stringify({
    path: filename
  }));
}