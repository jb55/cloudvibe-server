
var crypto = require('crypto');

var sutil = module.exports;


sutil.trim = function (str) {
  var s1 = str.replace(/^\s+/, "");
  return s1.replace(/\s+$/, "");
}

sutil.any = function (str, chars) {
  var reg = new RegExp("[" + chars + "]");
  return str.search(reg) != -1;
}

sutil.contains = function (str, cont) {
  return str.indexOf(cont) != -1;
}

sutil.hash = function (str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

sutil.validEmail = function (email) {
  return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
}
