'use strict';

const
  file = require('file'),
  rdfParser = require(('./lib/rdf-parser.js'));

console.log('walking directory');
file.walk(__dirname + '/cache', function(err, dirPath, dirs, files) {
  files.forEach(function(path) {
    rdfParser(path, function(err, data) {
      if (err) {
        throw err;
      } else {
        console.log(doc);
      }
    });
  });
});