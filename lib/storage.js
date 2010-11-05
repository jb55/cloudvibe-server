
var S3 = require('s3').S3;
var sutil = require('./sutil');
var fs = require('fs');

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
      console.log("error loading s3 keyfile:", err);
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

exports.save = function (fileName, destName, cb, progCb) {
  getKeys(function (access, secret) {
    var s3 = new S3(secret, access, defaultOptions);
    var host = defaultBucket + bucketPostfix;
    if (cb) {
      s3.on("complete", cb);
      s3.on("error", function (err) {
        if (progCb) {
          s3.removeListener('progress', progCb);
        }
        s3.removeListener('complete', cb);
        cb(err);
      });
    }
    if (progCb) {
      s3.on("progress", progCb);
    }
    s3.uploadFile(host, fileName, destName);
  });
}
