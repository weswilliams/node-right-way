'use strict';

const
  Q = require('q'),
  request = require('request');

module.exports = function(config, app) {
  
  /**
   * create a new bundle with the specified name
   * curl -X POST http://localhost:3000/api/bundle?name=<name>
   */
  console.log('POST bundle usage: curl -X POST http://localhost:3000/api/bundle?name=<name>');
  app.post('/api/bundle', function(req, res) {
    console.log('request to create bundle');
    let deferred = Q.defer();  
    request.post({
      url: config.b4db,
      json: { type: 'bundle', name: req.query.name, books: {} }
    }, function(err, couchRes, body) {
	
      if (err) {
        console.log('no couch resp: ' + err);
        deferred.reject(err);  
      } else {
        console.log('couch resp');
        deferred.resolve([couchRes, body]);  
      }
    });
    
    deferred.promise.spread(function(couchRes, body) {
//      let couchRes = args[0], body = args[1];
      console.log('couch resp: ' + couchRes + ', body: ' + body);
      res.json(couchRes.statusCode, body);
    }, function(err) {  
      res.json(502, { error: "bad_gateway", reason: err.code });
    });
  });
  
  /**
   * get a given bundle
   * curl -X POST http://localhost:3000/api/bundle/<id>
   */
  app.get('/api/bundle/:id', function(req, res) {  
    Q.nfcall(request.get, config.b4db + '/' + req.params.id)  
      .spread(function(couchRes, body) {
        let bundle = JSON.parse(body);
        res.json(couchRes.statusCode, bundle);
      }, function(err) {
        res.json(502, { error: "bad_gateway", reason: err.code });
      })
      .done();
  });
  
  /**
   * set the specified bundle's name with the specified name
   * curl -X PUT http://localhost:3000/api/bundle/<id>/name/<name>
   */
  console.log('PUT /api/bundle: curl -X PUT http://localhost:3000/api/bundle/<id>/name/<name>');
  app.put('/api/bundle/:id/name/:name', function(req, res) {
    console.log('name update request');
    Q.nfcall(request.get, config.b4db + '/' + req.params.id)
      .spread(function(couchRes, body) {
        let bundle = JSON.parse(body);
        console.log('tried to retrieve bundle: res: ' + couchRes +
          ', bundle: ' + bundle);
        if (couchRes.statusCode !== 200) {
          return [couchRes, bundle];  
        }
        
        bundle.name = req.params.name;
        console.log('updating bundle name: ' + bundle);
        return Q.nfcall(request.put, {  
          url: config.b4db + '/' + req.params.id,
          json: bundle
        });
      })
      .spread(function(couchRes, body) {
        res.json(couchRes.statusCode, body);
      })
      .catch(function(err) {
        console.log('error: ' + err);
        res.json(502, { error: "bad_gateway", reason: err.code });
      })
      .done();
  });
  
  /**
   * put a book into a bundle by its id
   * curl -X PUT http://localhost:3000/api/bundle/<id>/book/<pgid>
   */
  app.put('/api/bundle/:id/book/:pgid', function(req, res) {
    
    let
      get = Q.denodeify(request.get), 
      put = Q.denodeify(request.put);
    
    Q.async(function*() {
      let args, couchRes, bundle, book;
      
      // grab the bundle from the b4 database
      args = yield get(config.b4db + req.params.id);  
      couchRes = args[0];
      bundle = JSON.parse(args[1]);
      
      // fail fast if we couldn't retrieve the bundle
      if (couchRes.statusCode !== 200) {
        res.json(couchRes.statusCode, bundle);
        return;
      }
      
      // look up the book by its Project Gutenberg ID
      args = yield get(config.bookdb + req.params.pgid);  
      couchRes = args[0];
      book = JSON.parse(args[1]);
      
      // fail fast if we couldn't retrieve the book
      if (couchRes.statusCode !== 200) {
        res.json(couchRes.statusCode, book);
        return;
      }
      
      // add the book to the bundle and put it back in CouchDB
      bundle.books[book._id] = book.title;  
      args = yield put({url: config.b4db + bundle._id, json: bundle});
      res.json(args[0].statusCode, args[1]);
      
    })()  
    .catch(function(err) {  
      res.json(502, { error: "bad_gateway", reason: err.code });
    });
  });
  
  /**
   * remove a book from a bundle
   * curl -X DELETE http://localhost:3000/api/bundle/<id>/book/<pgid>
   */
  app.del('/api/bundle/:id/book/:pgid', function(req, res) {
    Q.async(function* (){
      
      let
        args = yield Q.nfcall(request, config.b4db + req.params.id),
        couchRes = args[0],
        bundle = JSON.parse(args[1]);
      
      // fail fast if we couldn't retrieve the bundle
      if (couchRes.statusCode !== 200) {
        res.json(couchRes.statusCode, bundle);
        return;
      }
      
      // fail if the bundle doesn't already have that book
      if (!(req.params.pgid in bundle.books)) {
        res.json(409, {
          error: "conflict",
          reason: "Bundle does not contain that book."
        });
        return;
      }
      
      // remove the book from the bundle
      delete bundle.books[req.params.pgid];
      
      // put the updated bundle back into CouchDB
      request.put({ url: config.b4db + bundle._id, json: bundle }).pipe(res);
      
    })()
    .catch(function(err) {
      res.json(502, { error: "bad_gateway", reason: err.code });
    });
  });
  
};

