
var pg     = require('pg')
  , logger = require('./logger')
  , _      = require('underscore')._;

var exports = module.exports;

//===----------------------------------------------------------------------===//
// Database
//===----------------------------------------------------------------------===//
function Database(cs) {
  this.cs = cs;
}

exports.Database = Database;

//===----------------------------------------------------------------------===//
// Database.createClient
//===----------------------------------------------------------------------===//
Database.createClient = function(cs, cb) {
  var db = new Database(cs);
  this.onConnect = cb;
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
  var self = this;
  pg.connect(cs, function(err, client){
    self.client = client;
    // disconnect when we're done our queries
    cb(err, client);
    //client.on('drain', client.end.bind(client));
  });
}

//===----------------------------------------------------------------------===//
// Database.insert
//   Generic insert functionality
//===----------------------------------------------------------------------===//
Database.prototype.insert = function(table, data, cb) {
  this.connect(function(err, client){
    if (err) return cb(err);

    var c = 1
      , keys = _.keys(data).join(", ")
      , values = _.values(data)
      , placeholders = _.map(data, function(){ return "$"+(c++); }).join(", ");

    var qs = ["INSERT INTO", table, "(", keys, ") VALUES (", placeholders, ")"]
             .join(" ");

    var q = client.query(qs, values, function(err){
      if (err) logger.error(err.message);
      return cb(err);
    });

    logger.query(q.text);

  });
}


//===----------------------------------------------------------------------===//
// Database.firstResult
//   Small helper function for retrieving the first result of a query
//===----------------------------------------------------------------------===//
Database.prototype.firstResult = function(err, r, cb) {
  return cb(err, (r || [])[0]);
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
    if (err) {
      logger.error(err.message);
      return cb(err);
    }
    var qs = Database.buildLookup(lookup, field, table, selected);
    logger.query(qs);
    client.query(qs, [lookup], function(err, result){
      if (err) {
        logger.error(err.message);
        return cb(err);
      }
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
    if (err) {
      logger.error("db.exists lookup: " + err.toString());
      return cb(err);
    }
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


//===----------------------------------------------------------------------===//
// Utilities
//===----------------------------------------------------------------------===//
exports.cloudvibeDb = function(cb) {
  var cs = Database.buildConnectionString(
    "localhost", 5432, "postgres", "postgres", "cloudvibe");
  return Database.createClient(cs, cb);
}

