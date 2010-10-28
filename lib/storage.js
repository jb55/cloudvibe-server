
var S3 = require('s3').S3;
var sutil = require('./sutil');
var fs = require('fs');

var bucketPostfix = '.s3.amazonaws.com';
var defaultBucket = 'cloudvibe';
var defaultKeyFile = '/etc/passwd-s3fs';

var defaultOptions = {
  acl: 'public-read',
  storageType: 'REDUCED_REDUNDANCY',
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
    var trimmed = sutil.trim(data);
    var splits = trimmed.split(":");
    awsAccessKey = splits[0];
    awsSecretKey = splits[1];
    cb(awsAccessKey, awsSecretKey);
  });
}

function getKeys (cb) {
  if (!awsSecretKey || !awsAccessKey)
    loadKeys("", cb);
  else
    cb(awsAccessKey, awsSecretKey);
}

exports.save = function (name, cb, stream) {
  getKeys(function (access, secret) {
    var s3 = new S3(secret, access, defaultOptions);
    var host = defaultBucket + bucketPostfix;
    cb(s3);
    s3.uploadFileToBucket(host, name, stream);
  });
}
