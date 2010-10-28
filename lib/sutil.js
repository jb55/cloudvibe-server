
exports.trim = function (str) {
  var s1 = str.replace(/^\s+/, "");
  return s1.replace(/\s+$/, "");
}
