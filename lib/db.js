
var pg = require('pg');
var _ = require('underscore')._;

//===----------------------------------------------------------------------===//
// Database
//===----------------------------------------------------------------------===//
function Database(cs) {
  this.cs = cs;
  this.log = function() {};
}


//===----------------------------------------------------------------------===//
// Database.setLog
//===----------------------------------------------------------------------===//
Database.prototype.setLog = function(log) {
  this.log = log;
  return this;
}


//===----------------------------------------------------------------------===//
// Database.createClient
//===----------------------------------------------------------------------===//
Database.createClient = function(cs, cb) {
  var db = new Database(cs);
  if (cb) db.connect(cb);
  return db;
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
    // disconnect when we're done our queries
    cb(err, client);
    //client.on('drain', client.end.bind(client));
  });
}

//===----------------------------------------------------------------------===//
// Database.lookup
//   Does a lookup of a database item on a given field
//===----------------------------------------------------------------------===//
Database.prototype.lookup = function(lookup, field, table, selected, cb) {
  var self = this;
  if (_.isFunction(selected)) {
    cb = selected;
    selected = "*";
  }

  self.connect(function(err, client){
    if (err) return cb(err);
    var qs = Database.buildLookup(lookup, field, table, selected);
    self.log(qs);
    client.query(qs, [lookup], function(err, result){
      if (err) return cb(err);
      var val = result.rows;
      cb(null, val);
    });
  });
}


//===----------------------------------------------------------------------===//
// Database.exists
//   Checks the existence of a database item
//===----------------------------------------------------------------------===//
Database.prototype.exists = function(lookup, field, table, cb) {
  this.lookup(lookup, field, table, "count(*)", function(err, result){
    if (err) return cb(err);
    result = result[0];
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
