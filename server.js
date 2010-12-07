require.paths.push(__dirname + '/lib');

var express = require('express')
  , _ = require('underscore')._
  , formidable = require('formidable')
  , storage = require('storage')
  , fs = require('fs')
  , util = require('util')
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

// Misc {{{
// View helpers
//  app.helpers({
//      name: function (a) { return "hi"; }
//    , author: "Bill Casarin"
//  });

function viewData (d) {
  return { locals: d };
}
// Misc }}}

// Root controller
app.get('/', function (req, res) {
  console.log(req);
  res.render("default");
});

// User controller {{{
app.get('/user/:user', function (req, res) {
  var user = req.params.user;
  res.render('user', viewData({user: user}));
});

app.put('/user/:user', function (req, res) {
  var user = req.params.user;
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
// User controller }}}

// Start listening for requests
app.listen(8080);
