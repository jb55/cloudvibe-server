
var express = require('express')
  , _ = require('underscore')._
  , uuid = require('node-uuid')
  , connect = require('connect')
  , logger = require('./lib/logger')
  , Database = require('./lib/db')
  , Song = require('./lib/song')
  , User = require('./lib/user')
  , storage = require('./lib/storage')
  , form = require('connect-form')
  , path = require('path')
  , sutil = require('./lib/sutil')
  , fs = require('fs')
  , util = require('util')
  , signup = require('./signup')
  ;


// Global (for testing only)
var GLOBALS = {};
GLOBALS.songData = [];

// Create the express server
var app = express.createServer();
var cs = Database.buildConnectionString(
  "localhost", 5432, "postgres", "postgres", "cloudvibe");
var db = Database.createClient(cs);

// Configuration {{{
// Shared configuration
app.configure(function () {
  app.use(express.bodyParser());
  app.use(form({ keepExtensions: true }));
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(connect.static(__dirname + '/public'));
});

// Production configuration
app.configure('production', function () {
  app.use(express.errorHandler());
});

// Development configuration
app.configure('developement', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStackT: true}));
});
// Configuration }}}

// Misc {{{
// View helpers
//  app.helpers({
//      name: function (a) { return "hi"; }
//    , author: "Bill Casarin"
//  });

function viewData (d) {
  var songs = d.songs || GLOBALS.songData;
  d.artists = selectUniq(songs, function (s) { return s.artist; });
  d.titles = selectUniq(songs, function (s) { return s.title; });
  return { locals: d };
}

function selectUniq(l, fn) {
  return _(l)
    .chain()
    .map(fn)
    .uniq()
    .value();
}

// Misc }}}

//===----------------------------------------------------------------------===//
// Root controller
//===----------------------------------------------------------------------===//
app.get('/', function (req, res){
  res.render("home/landing", { layout: false });
});

//===----------------------------------------------------------------------===//
// Setup signup routes
//===----------------------------------------------------------------------===//
signup.routes(app, db);

// User controller {{{


//===----------------------------------------------------------------------===//
// noUserResult
//===----------------------------------------------------------------------===//
function noUserResult(res) {
  res.writeHead(400);
  res.write("User doesn't exist");
  res.end();
}

//===----------------------------------------------------------------------===//
// [GET] Root user controller
//   /user/bill
//===----------------------------------------------------------------------===//
app.get('/user/:nick', function (req, res) {
  var nick = req.params.nick;

  User.get(db, nick, function(err, user){
    if (err || !user) return noUserResult(res);

    User.getSongs(db, user.id, function(err, songs){
      res.render('user', viewData({user: user, songs: songs}));
    });
  });

});


//===----------------------------------------------------------------------===//
// [PUT] Put song controller
//   /user/bill
//===----------------------------------------------------------------------===//
app.put('/user/:user', function (req, res) {
  var urlUser = req.params.user;
  User.exists(db, urlUser, function(err, userExists){
    if (!userExists) return noUserResult(res);

    var file = '/tmp/' + user + '-test';
    var ws = fs.createWriteStream(file);

    req.addListener('data', function (d) {
      ws.write(d);
    });

    req.addListener('end', function () {
      ws.end();
      res.writeHead(201);
      res.end();
    });

  });
});

//===----------------------------------------------------------------------===//
// [POST] Song upload controller
//   /user/bill/upload
//===----------------------------------------------------------------------===//
app.post('/user/:user/upload', function (req, res) {
  var nick = req.params.user;

  // Read in file data
  req.form.complete(function(err, fields, files) {
    // TODO: throw error and use an error handler
    if (err) {
      logger.error("Error parsing form multipart song data: " + err.message)
      res.writeHead(500);
      res.write("Error parsing song data");
      res.end();
      return;
    }

    var uid = uuid();
    fields.uid = uid;

    // Improve data and register song in database
    Song.improveData(fields, function(err, improvedData){
      User.get(db, nick, function(err, user){
        logger.info(nick + " adding '" + improvedData.filename +
          "' to their collection");
        Song.register(db, user.id, improvedData, function(err){
          if (err) logger.error(err.message);
        });
      });
    });

    var fileName = uid + ".mp3";
    var filePath = files.songFile.path;
    var uploadPath = nick + '/' + fileName;

    // Save to S3
    storage.save(filePath, uploadPath, function (err) {
      // clean up temporary files
      fs.unlink(filePath);
    });

    res.render("upload_complete", viewData({ fileName: fileName }));
  });
});


//===----------------------------------------------------------------------===//
// [POST] Sync web method
//   /user/bill/sync
//===----------------------------------------------------------------------===//
app.post('/user/:user/sync', function (req, res) {
  var nick = req.params.user;

  var d = "";
  req.addListener('data', function (chunk){
    d += chunk;
  });

  req.addListener('end', function(){
    User.get(db, nick, function(err, user) {
      var data = JSON.parse(d.toString());
      var md5s = _.pluck(data, "md5");

      db.lookup(user.id, 'user_id', 'song', 'md5', function(err, stored_md5s){
        stored_md5s = _.pluck(stored_md5s, "md5");
        var synced = _.intersect(md5s, stored_md5s);

        function stripSynced(data) {
          return _.filter(data, function(v){ return !_.include(synced, v); });
        }

        var toUpload = stripSynced(md5s);
        var toDownload = stripSynced(stored_md5s);
        var result = {upload: toUpload, download: toDownload};

        logger.info(nick + " syncing. " + toDownload.length + " to download, " +
          toUpload.length + " to upload");

        res.send(result);
      });
    });
  })

});

// User controller }}}

// Start listening for requests
app.listen(8083);
