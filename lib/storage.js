
var knox = require('knox')
  , sutil = require('./sutil')
  , logger = require('./logger')
  , mime = require('mime')
  , fs = require('fs');

var bucketPostfix = '.s3.amazonaws.com';
var defaultBucket = 'cloudvibe';
var defaultKeyFile = '/etc/passwd-s3fs';

var defaultOptions = {
  acl: 'public-read',
  storageType: 'REDUCED_REDUNDANCY',
  checkMD5: true
};

// use getKeys() instead of using these directly
var awsSecretKey;
var awsAccessKey;

// file format:  awsAccessKey:awsSecretKey
function loadKeys (fileName, cb) {
  fileName = fileName || defaultKeyFile;

  fs.readFile(fileName, "ascii", function (err, data) {
    if (err) {
      logger.error("Error loading s3 keyfile: " + err);
      return;
    }
    var splits = sutil.trim(data).split(":");
    awsAccessKey = splits[0];
    awsSecretKey = splits[1];
    cb(awsAccessKey, awsSecretKey);
  });
}

function getKeys (cb) {
  if (!awsSecretKey || !awsAccessKey)
    loadKeys("", cb);
  else
    return cb(awsAccessKey, awsSecretKey);
}

exports.save = function (fileName, destName, cb) {
  getKeys(function (access, secret) {

    var s3 = knox.createClient({
        key: access
      , secret: secret
      , bucket: defaultBucket
    });

    // Read from file and PUT to S3
    fs.readFile(fileName, function(err, buf){
      var req = s3.put(destName, {
          'Content-Length': buf.length
        , 'Content-Type': mime.lookup(destName)
      });

      req.on('response', function(res){
        if (res.statusCode == 200) {
          logger.info("[S3] Saved " + destName);
          if (cb) return cb(null);
        } else {
          logger.error("[S3] returned status code " + res.statusCode);
          return cb(new Error(res.statusCode));
        }
      });

      req.end(buf);
    });

  });
}
