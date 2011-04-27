

var logger = require("./logger")
  , User = require("./user")
  , Song = require('./song')
  , sutil = require("./sutil")
  , fs = require("fs")
  , form = require('connect-form')
  , uuid = require('node-uuid')
  , storage = require('./storage')
  , _ = require('underscore')._

var api = module.exports;

//===----------------------------------------------------------------------===//
// Controllers
//===----------------------------------------------------------------------===//
api.routes = function(app, db) {

  //===--------------------------------------------------------------------===//
  // [GET] Update song
  //   @param uuid
  //===--------------------------------------------------------------------===//
  app.post('/user/:user/update', function(req, res){
    // song id
    var id     = req.params.id
      , fields = req.params.fields;

  });

  //===--------------------------------------------------------------------===//
  // [GET] Download song
  //   @param uuid
  //   @return { download_link, song_data }
  //===--------------------------------------------------------------------===//
  app.get('/user/:user/download/:uuid', function(req, res){
    var uuid = req.params.uuid;
    var nick = req.params.user;
    User.get(db, nick, function(err, user){
      Song.getByUuid(db, uuid, function(err, song){
        song = Song.stripInvalidFields(song);

        if (err) {
          song = {}
        }
        else {
          song.download_url =
            "https://s3.amazonaws.com/cloudvibe/" + nick + "/" + uuid + ".mp3";
        }

        res.send(song);
      });
    });
  });

  //===--------------------------------------------------------------------===//
  // [POST] Song upload controller
  //   /user/bill/upload
  //===--------------------------------------------------------------------===//
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

      var uid = uuid().toString().toLowerCase();
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

      res.send("ok");
    });
  });

  //===--------------------------------------------------------------------===//
  // [POST] Sync web method
  //   /user/bill/sync
  //===--------------------------------------------------------------------===//
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

        db.lookup(user.id, 'user_id', 'song', 'md5, uid', function(err, db_data){
          var stored_md5s = _.pluck(db_data, "md5");
          var synced = _.intersect(md5s, stored_md5s);

          function stripSynced(data) {
            return _.filter(data, function(v){
              return !_.include(synced, v);
            });
          }

          var toUpload = stripSynced(md5s);
          var toDownload = stripSynced(stored_md5s);

          var uids = _(db_data).chain()
                               .select(function(s) {
                                 return _.include(toDownload, s.md5);
                               })
                               .pluck("uid")
                               .value();

          var result = {upload: toUpload, download: uids || []};

          logger.info(nick + " syncing. " + toDownload.length + " to download, "
            + toUpload.length + " to upload");

          res.send(result);
        });
      });
    })

  });

}
