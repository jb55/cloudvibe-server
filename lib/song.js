
var db = require('./db')
  , _ = require('underscore')._
  , aws = require('aws-lib')
  , logger = require('./logger')
  , Buffer = require('buffer').Buffer
  ;

//===----------------------------------------------------------------------===//
// User
//===----------------------------------------------------------------------===//
function Song() {
}


//===----------------------------------------------------------------------===//
// Song.fields
//===----------------------------------------------------------------------===//
Song.fields = [
  "album"
, "album_artist"
, "artist"
, "bitrate"
, "bpm"
, "comments"
, "composer"
, "filename"
, "genre"
, "id"
, "md5"
, "modified"
, "title"
, "track"
, "uid"
, "user_id"
, "year"
, "label"
, "publisher"
, "release_date"
, "studio"
, "img"
];

Song.immutableFields = [
  "id"
, "uid"
, "user_id"
];


var AWS_KEY = "";
var AWS_SECRET = "";

//===----------------------------------------------------------------------===//
// Song.register
//===----------------------------------------------------------------------===//
Song.register = function(db, user_id, data, cb) {
  var validData = Song.stripInvalidFields(data);
  validData.user_id = user_id;
  db.insert("public.song", validData, cb);
}


//===----------------------------------------------------------------------===//
// Song.update
//===----------------------------------------------------------------------===//
Song.update = function(db, songId, data, cb) {
  db.update("public.song", data, "id", songId, cb);
}


//===----------------------------------------------------------------------===//
// Song.get
//   Gets a user object from the database
//===----------------------------------------------------------------------===//
Song.getByUuid = function(db, lookup, cb) {
  return db.lookup(lookup, "uid", "public.song", function(err, res){
    return db.firstResult(err, res, cb);
  });
}


//===----------------------------------------------------------------------===//
// Song.improveData
// @brief Attempts to impove metadata quality
//
// @param {object} data
// @param {function} cb
// @return {object}
//===----------------------------------------------------------------------===//
Song.improveData = function(data, cb) {
  var improved = false;

  if(data.title == null || data.title == "") {
    return cb("NO_TITLE", data);
  }

  // TODO: Add logic to search based soley on title
  // in this case, however this can be tricky
  if(data.artist == null || data.artist == "") {
    return cb("NO_ARTIST", data);
  }

  data.modified = new Date();

  var prodAdv = aws.createProdAdvClient(AWS_KEY, AWS_SECRET, "null");
  function doReq(page) {

    if (page > 2)
      return cb(new Error("NO_FOUND"), data);

    prodAdv.call("ItemSearch", {SearchIndex: "MP3Downloads", Region:"US",
      Title: data.title, ItemPage: page, Keywords: data.artist,
      ResponseGroup: "Large"}, function(result) {

      for(var key in result.Items.Item) {
        var itemAttr = result.Items.Item[key].ItemAttributes;

        if (!itemAttr) {
          logger.notice("No improved data could be found for " + data.filename);
          return cb(null, data);
        }

        var artist = (itemAttr.Creator || {})["#"];
        var title = itemAttr.Title;

        if( artist == data.artist && title == data.title) {
          var year = (itemAttr.ReleaseDate || "").split("-");
          if (year.length > 0)
            year = year[0];

          data.label        = itemAttr.Label || "";
          data.artist       = artist;
          data.title        = title;
          data.genre        = itemAttr.Genre || "";
          data.publisher    = itemAttr.Publisher || "";
          data.release_date = itemAttr.ReleaseDate || "";
          data.year         = year || "";
          data.studio       = itemAttr.Studio || "";
          data.track_num    = itemAttr.TrackSequence || 0;
          data.image        = (itemAttr.MediumImage || {}).URL;

          return cb(null, data);
        }
      }

      doReq(page + 1);

    });
  }

  doReq(1);
}


//===----------------------------------------------------------------------===//
// Song.stripInvalidFields
//===----------------------------------------------------------------------===//
Song.stripInvalidFields = function(data) {
  var fields = _(data).chain().keys().intersect(Song.fields).value()
    , validData = {};
  _.each(fields, function(field){ validData[field] = data[field]; });
  return validData;
}


//===----------------------------------------------------------------------===//
// Song.stripForUpdate
//   Strips immutable fields and invalid fields
//===----------------------------------------------------------------------===//
Song.stripForUpdate = function(data) {
  data = Song.stripInvalidFields(data);
  _.each(data, function(val, key){
    if (_.include(Song.immutableFields, key))
      delete data[key];
  });
  return data;
}


module.exports = Song;
