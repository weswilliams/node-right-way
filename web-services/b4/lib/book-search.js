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

function asyncRequest(request, res) {
  let qRequest = Q.denodeify(request);
  return Q.async(function*() {
    console.log('args: ' + arguments);
    let
      values = yield qRequest.apply(null, arguments),
        couchRes = values[0],
        body = values[1];
    if (couchRes.statusCode !== 200) {
      console.log('couch err: ' + couchRes.statusCode);
      res.json(couchRes.statusCode, JSON.parse(body));
      return;
    }
    console.log("requested value: " + body);
    return yield JSON.parse(body);
  });
}

module.exports = function (config, app) {

  function findViews(res) {
    console.log('find views');
    let get = asyncRequest(request.get, res);
    return Q.async(function*() {
      let views = yield get(config.bookdb + '_design/books/');
      console.log("views: " + JSON.stringify(views));
      return yield views.views;
    });
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
        error: 'view not available',
        reason: ''
      };
    }
  }

  app.get('/api/search/book/by_:view', function (req, res) {
    let qRequest = Q.denodeify(request);
    Q.async(function*() {
      let views, filteredViews, values, couchRes, body, books = {};
      views = yield findViews(res)();
      filteredViews = filterViews(views, 'by_');
      viewNotAvailable(filteredViews, 'by_' + req.params.view);
      values = yield qRequest({
        method: 'GET',
        url: config.bookdb + '_design/books/_view/by_' + req.params.view,
        qs: {
          key: JSON.stringify(req.query.q),
          reduce: false,
          include_docs: true
        }
      });
      couchRes = values[0];
      body = values[1];
      if (couchRes.statusCode !== 200) {
        res.json(couchRes.statusCode, JSON.parse(body));
        return;
      }

      JSON.parse(body).rows.forEach(function (elem) {
        books[elem.doc._id] = elem.doc.title;
      });
      res.json(books);
    })()
      .catch(function (err) {
        console.log('error finding available books: ' + JSON.stringify(err));
        res.json(502, { error: "bad_gateway", reason: err.code });
      });
  });
};
