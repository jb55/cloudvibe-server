
var db = require('./db')
  , _ = require('underscore')._
  , sutil = require('./sutil')
  , logger = require('./logger')
  , Buffer = require('buffer').Buffer
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
User.register = function(db, nick, pass, cb) {
  User.exists(db, nick, function(err, exists){
    if (exists) {
      logger.notice("User '" + nick + "' already exists");
      return cb(new Error("User already exists"), exists);
    }

    db.connect(function (err, client){
      if (err) {
        logger.error("Error connecting to database in User.register");
        return cb(err);
      }

      var hashedPassword = sutil.hash(pass + User.salt);

      var qs = "INSERT INTO public.user(nick, pass) values($1, $2)";
      var vars = [nick, hashedPassword];
      client.query(qs, vars, function(err, result){
        if (err) return cb(err);
        cb(null, nick);
      });

    });
  });
}


//===----------------------------------------------------------------------===//
// User.login
//   Attempts to authenticate a user
//===----------------------------------------------------------------------===//
User.login = function(db, name, password, cb) {
  User.get(db, name, function(err, user){
    if (err) return cb(err, false);

    var hashedPassword = sutil.hash(password + User.salt)
      , valid = user.pass == hashedPassword;

    if (valid) {
      logger.info(name + " logged in.");
    }
    else {
      logger.notice(name + " login failed.");
    }

    return cb(null, valid);
  });
}

//===----------------------------------------------------------------------===//
// User.exists
//   Takes a username and a callback that receives a possible error and a bool
//   which is true if the user already exists
//===----------------------------------------------------------------------===//
User.exists = function(db, lookup, cb) {
  return User.lookupFn(db, lookup, db.exists, cb);
}


//===----------------------------------------------------------------------===//
// User.get
//   Gets a user object from the database
//===----------------------------------------------------------------------===//
User.get = function(db, lookup, cb) {
  return User.lookupFn(db, lookup, db.lookup, function(err, result){
    return db.firstResult(err, result, cb);
  });
}


//===----------------------------------------------------------------------===//
// User.getSongs
//   Gets all of the songs for a given user
//===----------------------------------------------------------------------===//
User.getSongs = function(db, user_id, cb) {
  return db.lookup(user_id, "user_id", "public.song", cb);
}


//===----------------------------------------------------------------------===//
// User.lookupFn
//   Applies lookup functions such as lookup and exists
//===----------------------------------------------------------------------===//
User.lookupFn = function(db, lookup, fn, cb) {
  if (_.isNumber(lookup)) {
    return fn.call(db, lookup, 'id', 'public.user', cb);
  } else {
    return fn.call(db, lookup, 'nick', 'public.user', cb);
  }
}


//===----------------------------------------------------------------------===//
// User.isValidName
//===----------------------------------------------------------------------===//
User.isValidName = function(name) {
  return !/[^a-zA-Z0-9]/.test(name);
}

module.exports = User;
