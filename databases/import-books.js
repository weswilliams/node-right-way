'use strict';

const
  async = require('async'),
  request = require('request'),
  file = require('file'),
  rdfParser = require(('./lib/rdf-parser.js')),
  work = async.queue(function(path, done) {
    rdfParser(path, function(err, data) {
      if (err) { throw Error(err); }
      request({
        method: 'PUT',
        url: 'http://localhost:5984/books/' + data._id,
        json: data
      }, function(err, res, body) {
        if (err) { throw Error(err); }
        console.log(res.statusCode, body);
        done();
      });
    });
  }, 10);

console.log('walking files');
file.walk(__dirname + '/cache', function(err, dirPath, dirs, files) {
  files.forEach(function(path) {
    work.push(path);
  });
});