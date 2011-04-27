
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
// Database.valueList
//   Builds a value list from a dictionary
//===----------------------------------------------------------------------===//
Database.valueList = function(data) {
  var c = 1
    , keys         = _.keys(data).join(", ")
    , values       = _.values(data)
    , placeholders = _.map(data, function(){ return "$"+(c++); }).join(", ")
    , vl = ["(", keys, ") VALUES (", placeholders, ")"].join(" ");
  return { str: vl, values: values };
};

//===----------------------------------------------------------------------===//
// Database._command
//   command error handling and plumbing
//===----------------------------------------------------------------------===//
Database.prototype._command = function(clientCb, cb) {
  this.connect(function(err, client){
    if (err) return clientCb(err);
    cb(client, function(qs, values, resFn){
      logger.query(qs + " <WITH> " + values.toString());
      client.query(qs, values, function(err, result){
        if (err) logger.error(err.message);
        if (!err && resFn)
          return resFn(err, result)
        else
          return clientCb(err, result);
      });
    });
  });
}

//===----------------------------------------------------------------------===//
// Database.update
//===----------------------------------------------------------------------===//
Database.prototype.update = function(table, data, where, whereVal, cb) {
  this._command(cb, function(client, queryFn){
    var c = 1
      , values = _.values(data)
      , pair = function(val, key) { return key + " = $" + (c++); }
      , pairs = _.map(data, pair)
      , joinedPairs = pairs.join(", ")
      , wherePair = pair(whereVal, where)
      , qs = ["UPDATE", table, "SET", joinedPairs, "WHERE", wherePair].join(" ");

    values.push(whereVal);

    queryFn(qs, values);
  })
}

//===----------------------------------------------------------------------===//
// Database.insert
//   Generic insert functionality
//===----------------------------------------------------------------------===//
Database.prototype.insert = function(table, data, cb) {
  this._command(cb, function(client, queryFn){
    var vl = Database.valueList(data)
      , qs = ["INSERT INTO", table, vl.str].join(" ");
    queryFn(qs, vl.values);
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

  this._command(cb, function(client, queryFn){
    var qs = Database.buildLookup(lookup, field, table, selected);
    queryFn(qs, [lookup], function(err, result){
      return cb(err, result.rows);
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


//===----------------------------------------------------------------------===//
// Utilities
//===----------------------------------------------------------------------===//
exports.cloudvibeDb = function(cb) {
  var cs = Database.buildConnectionString(
    "localhost", 5432, "postgres", "postgres", "cloudvibe");
  return Database.createClient(cs, cb);
}

