
var express = require('express')
  , _ = require('underscore')._
  , Database = require('./lib/db')
  , User = require('./lib/user')
  , storage = require('./lib/storage')
  , formidable = require('formidable')
  , path = require('path')
  , fs = require('fs')
  , util = require('util')
  ;

// Global (for testing only)
var GLOBALS = {};
GLOBALS.songData = [];

// Create the express server
var app = express.createServer();
var cs = Database.buildConnectionString(
  "localhost", 5432, "postgres", "postgres", "cloudvibe");
var db = Database.createClient(cs).setLog(console.log);

// Configuration {{{
// Shared configuration
app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.staticProvider(__dirname + '/public')); 
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
  d.artists = selectUniq(GLOBALS.songData, function (s) { return s.artist; });
  d.titles = selectUniq(GLOBALS.songData, function (s) { return s.title; });
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
app.get('/', function (req, res) {
  res.render("default", viewData({}));
});

// User controller {{{

//===----------------------------------------------------------------------===//
// [GET] Root user controller
//   /user/bill
//===----------------------------------------------------------------------===//
app.get('/user/:nick', function (req, res) {
  var nick = req.params.nick;

  User.get(db, nick, function(err, user){
    if (err || !user) {
      res.writeHead(400);
      res.write("User doesn't exist");
      res.end();
      return;
    }
    res.render('user', viewData({user: user}));
  });


//User.exists(db, nick, function(err, userExists){
//  if (!userExists) {
//    res.writeHead(200);
//    res.write("User doesn't exist");
//    res.end();
//    return;
//  }
//});

});


//===----------------------------------------------------------------------===//
// [PUT] Put song controller
//   /user/bill
//===----------------------------------------------------------------------===//
app.put('/user/:user', function (req, res) {
  var urlUser = req.params.user;
  User.exists(db, urlUser, function(err, userExists){
    if (!userExists) {
      res.writeHead(400);
      res.write("User doesn't exist");
      res.end();
      return;
    }

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
  var form = new formidable.IncomingForm();
  var user = req.params.user;

  form.addListener('progress', function (received, expected) {
    console.log(user + ' Uploading to server progress:', (received /
      expected)*100, '%');
  });

  // Read in file data
  form.parse(req, function(err, fields, files) {

    // TODO: throw error and use an error handler
    if (err) {
      res.writeHead(500);
      res.write("Error parsing song data");
      res.end();
      return;
    }

    var fileName = path.basename(files.songFile.filename);
    var filePath = files.songFile.path;
    var uploadPath = user + '/' + fileName;

    console.log(fileName, filePath, uploadPath);

    // Save to S3
    storage.save(filePath, uploadPath, function (err) {
      if (err) {
        console.log(err);
      }
      // clean up temporary files
      fs.unlink(filePath);
    }, function (percent) {
      console.log(user + ' Uploading to S3 progress:', percent, '%');
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

  req.addListener('data', function (d){
    User.get(db, nick, function(err, user) {
      var data = JSON.parse(d.toString());
      console.log(data);
      var md5s = _.map(data, function(song){ return song.md5; });
      db.lookup(user.id, 'user_id', 'song', 'md5', function(stored_md5s){
        var synced = _.intersect(md5s, stored_md5s);
        var toUpload = _.without(md5s, synced);
        var toDownload = _.without(stored_md5s, synced);
        var result = {upload: toUpload, download: toDownload};
        res.send(result);
      });
    });
  });

});

// User controller }}}

// Start listening for requests
app.listen(8080);
