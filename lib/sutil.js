
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

sutil.invalidEmail = function (email) {
  return /^[A-Z0-9._%\+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/.test(email);
}
