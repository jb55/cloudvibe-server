
var db = require('./db')
  , _ = require('underscore')._
  , Buffer = require('buffer').Buffer
  , crypto = require('crypto')
  ;

//===----------------------------------------------------------------------===//
// User
//===----------------------------------------------------------------------===//
function User() {
}

//===----------------------------------------------------------------------===//
// User.salt
//   Salt used in hashes
//===----------------------------------------------------------------------===//
User.salt = "-cloudvibe2"

//===----------------------------------------------------------------------===//
// User.isValidNick
//   Takes a username and returns true if the username is valid
//===----------------------------------------------------------------------===//
User.isValidNick = function(nick) {
  return
       nick.length <= 16
    && !/[^\w]/.test(nick) // contains only alphanumeric characters
}


//===----------------------------------------------------------------------===//
// User.register
//   Takes a username, password, and a callback which receives an error if the
//   username is already taken.
//===----------------------------------------------------------------------===//
User.register = function(cs, nick, pass, cb) {
  User.exists(cs, nick, function(err, exists){
    if (exists) return cb(new Error("User already exists"));

    db.createClient(cs, function (err, client){
      if (err) return cb(err);

      var hashedPassword =
        crypto
          .createHash('sha1')
          .update(pass + User.salt)
          .digest('hex');

      var qs = "INSERT INTO public.user(nick, pass) values($1, $2)";
      var vars = [nick, hashedPassword];
      client.query(qs, vars, function(err, result){
        if (err) return cb(err);
        cb(null, nick);
        client.end();
      });

    });
  });
}


//===----------------------------------------------------------------------===//
// User.exists
//   Takes a username and a callback that receives a possible error and a bool
//   which is true if the user already exists
//===----------------------------------------------------------------------===//
User.exists = function(cs, lookup, cb) {
  return User.lookupFn(cs, lookup, db.exists, cb);
}


//===----------------------------------------------------------------------===//
// User.get
//   Gets a user object from the database
//===----------------------------------------------------------------------===//
User.get = function(cs, lookup, cb) {
  return User.lookupFn(cs, lookup, db.lookup, cb);
}


//===----------------------------------------------------------------------===//
// User.lookupFn
//   Applies lookup functions such as lookup and exists
//===----------------------------------------------------------------------===//
User.lookupFn = function(cs, lookup, fn, cb) {
  if (_.isNumber(lookup)) {
    return fn(cs, lookup, 'id', 'public.user', cb);
  } else {
    return fn(cs, lookup, 'nick', 'public.user', cb);
  }
}

module.exports = User;
