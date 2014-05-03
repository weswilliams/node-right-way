/***
 * Excerpted from "Node.js the Right Way",
 * published by The Pragmatic Bookshelf.
 * Copyrights apply to this code. It may not be used to create training material,
 * courses, books, articles, and the like. Contact us if you are in doubt.
 * We make no guarantees that this code is fit for any purpose.
 * Visit http://www.pragmaticprogrammer.com/titles/jwnode for more book information.
 ***/
/**
 * search for books by a given field (author or subject)
 * curl http://localhost:3000/api/search/book/by_author?q=Giles,%20Lionel
 * curl http://localhost:3000/api/search/book/by_subject?q=War
 */
'use strict';
const
  request = require('request'),
  underscore = require('underscore');

module.exports = function (config, app) {

  function findViews(callback) {
    console.log('find books');
    request({
      method: 'GET',
      url: config.bookdb + '_design/books/'
    }, function (err, couchRes, body) {
      if (err) {
        console.log('error finding available views: ' + err);
        callback(502, { error: "bad_gateway", reason: err.code });
        return;
      }
      if (couchRes.statusCode !== 200) {
        console.log('couch error finding available views: ' + couchRes.statusCode);
        callback(couchRes.statusCode, JSON.parse(body));
        return;
      }
      console.log('found views: ' + body);
      callback(null, JSON.parse(body).views);
    });
  }

  function filterViews(filterBy, callback) {
    return function(err, views) {
      if (err) {
        console.log(err);
        return;
      }
      let filteredViews = underscore.chain(views)
        .keys(function (name) {
          return name.indexOf(filterBy) === 0;
      }).value();
      console.log('filtered views: ' + filteredViews);
      callback(null, filteredViews);
    };
  }

  var ex_view = {
    "_id": "_design/books",
    "_rev": "1-81dd5364f1595d7d4404536462397004",
    "views": {
      "by_author": {
        "map": "function (doc) {\n      if (doc.authors) {\n        doc.authors.forEach(emit);\n      }\n    }",
        "reduce": "_count"},
      "by_subject": {
        "map": "function (doc) {\n      if ('subjects' in doc) {\n        doc.subjects.forEach(function(subject){\n          emit(subject, subject);\n\n          subject.split(/\\s+--\\s+/).forEach(function(part){\n            emit(part, subject);\n          });\n        });\n      }\n    }",
        "reduce": "_count"}
    }
  };

  function viewNotAvailable(availableViewNames, viewName) {
    return !underscore.contains(availableViewNames, viewName);
  }

  app.get('/api/search/book/by_:view', function (req, res) {
    findViews(filterViews('by_', function(err, availableViews) {
      if (err) {
        res.json(502, { error: "bad_gateway", reason: err.code });
        return;
      }
      if (viewNotAvailable(availableViews, 'by_' + req.params.view)) {
        res.json(400, { error: 'view not available' });
        return;
      }
      request({
        method: 'GET',
        url: config.bookdb + '_design/books/_view/by_' + req.params.view,
        qs: {
          key: JSON.stringify(req.query.q),
          reduce: false,
          include_docs: true
        }
      }, function (err, couchRes, body) {

        // couldn't connect to CouchDB
        if (err) {
          res.json(502, { error: "bad_gateway", reason: err.code });
          return;
        }

        // CouchDB couldn't process our request
        if (couchRes.statusCode !== 200) {
          res.json(couchRes.statusCode, JSON.parse(body));
          return;
        }

        // send back simplified documents we got from CouchDB
        let books = {};
        JSON.parse(body).rows.forEach(function (elem) {
          books[elem.doc._id] = elem.doc.title;
        });
        res.json(books);

      });

    }));
  });
};
