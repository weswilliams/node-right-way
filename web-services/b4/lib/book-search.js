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
  Q = require('q'),
  underscore = require('underscore');

function asyncRequest(request) {
  let qRequest = Q.denodeify(request);
  return Q.async(function*() {
    console.log('args: ' + arguments);
    let
      values = yield qRequest.apply(null, arguments),
        couchRes = values[0],
        body = values[1];
    if (couchRes.statusCode !== 200) {
      console.log('couch err: ' + couchRes.statusCode);
      throw {
        code: couchRes.statusCode,
        reason: JSON.parse(body)
      };
    }
    console.log("requested value: " + body);
    return JSON.parse(body);
  });
}

module.exports = function (config, app) {

  function findViews() {
    console.log('find views');
    let get = asyncRequest(request.get);
    return Q.async(function*() {
      let views = yield get(config.bookdb + '_design/books/');
      console.log("views: " + JSON.stringify(views));
      return views.views;
    })();
  }

  function retrieveBooksView(viewName, key) {
    return Q.async(function*() {
      let qRequest = asyncRequest(request);
      return yield qRequest({
        method: 'GET',
        url: config.bookdb + '_design/books/_view/by_' + viewName,
        qs: {
          key: JSON.stringify(key),
          reduce: false,
          include_docs: true
        }
      });
    })();
  }

  function filterViews(views, filterBy) {
    let filteredViews = underscore.chain(views)
      .keys(function (name) {
        return name.indexOf(filterBy) === 0;
      }).value();
    console.log('filtered views: ' + filteredViews);
    return filteredViews;
  }

  function viewNotAvailable(availableViewNames, viewName) {
    if (!underscore.contains(availableViewNames, viewName)) {
      throw {
        code: 400,
        reason: 'view not available'
      };
    }
  }

  function bookTitlesById(body) {
    let books = {};
    body.rows.forEach(function (elem) {
      books[elem.doc._id] = elem.doc.title;
    });
    return books;
  }

  function resErrorHandler(res) {
    return function (err) {
      console.log('error finding available books: ' + JSON.stringify(err));
      if (err.reason && err.code) {
        res.json(err.code, err);
      } else {
        res.json(502, { error: "bad_gateway", reason: err.code });
      }
    };
  }

  app.get('/api/search/book/by_:view', function (req, res) {
    Q.async(function*() {
      let filteredViews, body, by_Prefix = 'by_';
      filteredViews = filterViews(yield findViews(), by_Prefix);
      viewNotAvailable(filteredViews, by_Prefix + req.params.view);
      body = yield retrieveBooksView(req.params.view, req.query.q);
      res.json(bookTitlesById(body));
    })().catch(resErrorHandler(res));
  });
};
