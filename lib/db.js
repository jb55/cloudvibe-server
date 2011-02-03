
var pg = require('pg');

//===----------------------------------------------------------------------===//
// Database
//===----------------------------------------------------------------------===//
function Database(cs) {
  this.cs = cs;
  Database.log = function() {};
}


//===----------------------------------------------------------------------===//
// Database.createClient
//===----------------------------------------------------------------------===//
Database.createClient = function(cs, cb) {
  var db = new Database(cs);
  if (cb) db.connect(cb);
}


//===----------------------------------------------------------------------===//
// Database.buildConnectionString
//===----------------------------------------------------------------------===//
Database.buildConnectionString = function(host, port, user, pass, db){
  return ["pg://", user, ":", pass, "@", host, ":", port, "/", db].join("");
}


//===----------------------------------------------------------------------===//
// Database.connect
//===----------------------------------------------------------------------===//
Database.prototype.connect = function(cb, cs) {
  cs = cs || this.cs;
  pg.connect(cs, function(err, client){
    cb(err, client);
  });
}


//===----------------------------------------------------------------------===//
// Database.lookup
//   Does a lookup of a database item on a given field
//===----------------------------------------------------------------------===//
Database.lookup = function(cs, lookup, field, table, selected, cb) {
  if (selected == typeof "function") {
    cb = selected;
    selected = "*";
  }

  Database.createClient(cs, function(err, client){
    if (err) return cb(err);
    var qs = Database.buildLookup(lookup, field, table, selected);
    Database.log(qs);
    client.query(qs, [lookup], function(err, result){
      if (err) return cb(err);
      var val = result.rows[0];
      cb(null, val);
      client.end();
    });
  });
}


//===----------------------------------------------------------------------===//
// Database.exists
//   Checks the existence of a database item
//===----------------------------------------------------------------------===//
Database.exists = function(cs, lookup, field, table, cb) {
  Database.lookup(cs, lookup, field, table, "count(*)", function(err, result){
    if (err) return cb(err);
    var doesExist = result && result.count > 0;
    cb(null, doesExist);
  });
}


//===----------------------------------------------------------------------===//
// Database.buildLookup
//   Builds a specific query string
//===----------------------------------------------------------------------===//
Database.buildLookup = function(lookup, field, table, selected) {
  return ["SELECT", selected, "FROM", table, "WHERE", field, "= $1"].join(" ");
}


module.exports = Database;
