
var vows     = require('vows')
  , signup   = require('../signup')
  , sutil    = require('../lib/sutil')
  , assert   = require('assert')
  , User     = require('../lib/user')
  , logger   = require('../lib/logger')
  , persist  = require('../lib/db');

logger.level = "error";

var db = persist.cloudvibeDb();


//===----------------------------------------------------------------------===//
// user tests
//===----------------------------------------------------------------------===//
vows.describe('user').addBatch({
  'An existing user': {
    topic: 'bill',
    'when passed into User.exists': {
      topic: function(user) {
        User.exists(db, user, this.callback);
      },
      'should return true in the callback': function(exists) {
        assert.equal(exists, true);
      }
    }
  },
  'An invalid username': {
    topic: '  df=',
    'when passed into User.exists': {
      topic: function(user) {
        User.exists(db, user, this.callback);
      },
      'should return false in the callback': function(exists) {
        assert.equal(exists, false);
      }
    },
    'should not pass User.isValidName': function(user) {
      assert.equal(User.isValidName(user), false);
    }
  }
}).export(module);


//===----------------------------------------------------------------------===//
// signup tests
//===----------------------------------------------------------------------===//
vows.describe('signup').addBatch({
  'An invalid signup model after validation': {
    topic: function() {
      su = signup.model('\'hur', 'jb+@jb55.com', '', 'a');
      su.isValid = signup.validate(su);
      return su;
    },
    'returns false': function(topic) {
      assert.equal(topic.isValid, false);
    },
    'with a email that has a plus in it': {
      'should pass sutil.validEmail': function(topic) {
        assert.equal(sutil.validEmail(topic.email), true);
      },
      'should not contain errors': function(topic){
        assert.isUndefined(topic.errors.email);
      },
    },
    'with an invalid username': {
      'should not pass User.isValidName': function(topic) {
        assert.equal(User.isValidName(topic.name), false);
      },
      'should contain errors': function(topic){
        assert.ok(topic.errors.name);
      }
    },
    'with mismatched passwords': {
      'should contain errors': function(topic){
        assert.ok(topic.errors.password);
      }
    },
    'with an empty password': {
      'should contain errors': function(topic){
        assert.ok(topic.errors.password);
      }
    }
  },
  'A valid signup model': {
    topic: signup.model('bill', 'bill.casarin@amazon.ca', 'password', 'password'),
    'after validation': {
      topic: function(su) {
        signup.validate(su);
        return su;
      },
    }
  }
}).export(module);


