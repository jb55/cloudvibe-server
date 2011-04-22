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

var Song = require("./lib/song");

var testData = {title: "My Title", artist: "Some artist"};

Song.improveData(testData, function(err, improvedData){
  console.log(improvedData.title);
});
