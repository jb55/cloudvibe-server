
var express = require('express')
  , _ = require('underscore')._
  , db = require('./lib/db')
  , User = require('./lib/user')
  , storage = require('./lib/storage')
  , formidable = require('formidable')
  , fs = require('fs')
  , util = require('util')
  ;

// Global (for testing only)
var GLOBALS = {};
GLOBALS.songData = [];

// Create the express server
var app = express.createServer();
db.cs = db.buildConnectionString(
  "localhost", 5432, "postgres", "postgres", "cloudvibe");

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
app.get('/user/:user', function (req, res) {
  var user = req.params.user;
  User.exists(db.cs, user, function(err, userExists){
    if (!userExists) {
      res.writeHead(200);
      res.write("User doesn't exist");
      res.end();
      return;
    }

    res.render('user', viewData({user: user}));
  });
});


//===----------------------------------------------------------------------===//
// [PUT] Put song controller
//   /user/bill
//===----------------------------------------------------------------------===//
app.put('/user/:user', function (req, res) {
  var urlUser = req.params.user;
  User.exists(db.cs, urlUser, function(err, userExists){
    if (!userExists) {
      res.writeHead(400);
      res.write("User doesn't exist");
      res.end();
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
    console.log(user + ' Uploading to server progress:', (received / expected)*100, '%');
  });

  // Read in file data
  form.parse(req, function(err, fields, files) {
    var fileName = files.songFile.filename;
    var path = files.songFile.path;
    var uploadPath = user + '/' + fileName;

    // Save to S3
    storage.save(path, uploadPath, function (err) {
      if (err) {
        console.log(err);
      }
      // clean up temporary files
      fs.unlink(path);
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
  req.addListener('data', function (d) {
    GLOBALS.songData = JSON.parse(d.toString());
  });

  res.send("ok");
});

// User controller }}}

// Start listening for requests
app.listen(8080);
