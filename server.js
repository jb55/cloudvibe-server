
var express = require('express')
  , _ = require('underscore')._
  , connect = require('connect')
  , logger = require('./lib/logger')
  , persistence = require('./lib/db')
  , Song = require('./lib/song')
  , User = require('./lib/user')
  , path = require('path')
  , sutil = require('./lib/sutil')
  , form = require('connect-form')
  , util = require('util')
  , signup = require('./signup')
  , login = require('./login')
  , api = require('./lib/api')
  ;


// Global (for testing only)
var GLOBALS = {};
GLOBALS.songData = [];

// Create the express server
var app = express.createServer();
var db = persistence.cloudvibeDb();

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
// Routes
//===----------------------------------------------------------------------===//
signup.routes(app, db, function after(req, res, user){
  res.redirect('/user/' + user);
});

login.routes(app, db, function after(req, res, user){
  res.redirect('/user/' + user);
});

api.routes(app, db);



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



// User controller }}}

// Start listening for requests
app.listen(8083);
