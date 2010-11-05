require.paths.push(__dirname + '/lib');

var express = require('express')
  , _ = require('underscore')._
  , formidable = require('formidable')
  , storage = require('storage')
  , fs = require('fs')
  ;

// Create the express server
var app = express.createServer();

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

// View helpers
/*
app.helpers({
    name: function (a) { return "hi"; }
  , author: "Bill Casarin"
});
*/

function viewData (d) {
  return { locals: d };
}

// Root controller
app.get('/', function (req, res) {
  res.render("default");
});

// User controller
app.get('/user/:id', function (req, res) {
  var id = req.params.id;
  res.render('user', viewData({name: id}));
});

app.post('/user/:user/upload', function (req, res) {
  var form = new formidable.IncomingForm();
  var user = req.params.user;

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
    });

    res.render("upload_complete", viewData({ fileName: fileName }));
  });
});

// Start listening for requests
app.listen(8080);
