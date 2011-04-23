/*
require.paths.push(__dirname + '/lib');
var storage = require('storage');


var testFile = "data/song.mp3"

storage.save(testFile, function(s3) {
  s3.on("error", function (err) {
    console.log(err);
  });

  s3.on("progress", function (percentSent) {
    if (+percentSent % 10 == 0)
      console.log("Percent: " + percentSent + "%");
  });

  s3.on("complete", function (hadError) {
      console.log("Transfer of " + testFile + " completed");
  });
})
*/

var User = require("./lib/user");
var _db = require("./lib/db");
var cs = _db.buildConnectionString(
  "localhost", 5432, "postgres", "postgres", "cloudvibe");
var db = _db.createClient(cs);

var testUser = "testuser";

User.exists(db, testUser, function(err, userExists){
  if (err) throw err;
  if (!userExists) {
    User.register(db, testUser, "derp", function(err, user){
      if (err) throw err;
      console.log("Created user", user);
    });
  } else {
    console.log("User", testUser, "exists");
  }
});
