'use strict';

const
  fs = require('fs'),
  cheerio = require('cheerio');

module.exports = function(filename, callback) {
  fs.readFile(filename, function(err, data) {
    if (err) { return callback(err); }
    let
      $ = cheerio.load(data.toString()),
      collect = function(index, elem) {
        return $(elem).text();
      },
      toArray = function(cheerioObj) {
        let values = [];
        for (let i = 0; i < cheerioObj.length; i++) {
          values[i] = cheerioObj[i];
        }
        return values;
      };
    callback(null, {
      _id: $('pgterms\\:ebook').attr('rdf:about').replace('ebooks/', ''),
      title: $('dcterms\\:title').text(),
      authors: toArray($('pgterms\\:agent pgterms\\:name').map(collect)),
      subjects: toArray($('[rdf\\:resource$="/LCSH"]').parent().find('rdf\\:value').map(collect))
    });
  });
};