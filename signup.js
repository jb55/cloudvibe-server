
var signup = module.exports
  , logger = require("./lib/logger")
  , User = require("./lib/user")
  , sutil = require("./lib/sutil");

//===----------------------------------------------------------------------===//
// signup.model
//===----------------------------------------------------------------------===//
signup.model = function(name, email, password, confirm, errors) {
  return {
    errors: errors || {}
  , name: name || ""
  , email: email || ""
  , password: password || ""
  , confirmpassword: confirm || ""
  }
}

//===----------------------------------------------------------------------===//
// signup.render
//===----------------------------------------------------------------------===//
signup.render = function(res, data) {
  res.render("home/signup", { layout: false, locals: { user: data } });
}


signup.validate = function(user) {
  if (/[^a-zA-Z0-9]/.test(user.name)) {
    user.errors.name = "Invalid username";
    logger.notice("Invalid username '" + user.name + "'");
  }

  if (user.name.length > 32) {
    user.errors.name = "Username too long";
    logger.notice("Username too long '" + user.name + "'");
  }

  if (sutil.invalidEmail(user.email)) {
    user.errors.email = "Invalid email address";
    logger.notice("Invalid email '" + user.email + "'");
  }

  if (!user.password) {
    user.errors.password = "You must enter a password";
  }

  if (user.password != user.confirmpassword) {
    user.errors.password = "Passwords do not match";
  }
}

signup.routes = function(app, db) {

  app.get('/signup', function (req, res){
    var user = signup.model("name", "email");
    signup.render(res, user);
  });

  app.post('/signup', function (req, res){
    var user = req.body.user;
    user.errors = {};

    signup.validate(user);

    User.register(db, user.name, user.password, function(err, exists){
      if (exists) {
        // user already exists
        logger.notice("User '" + user.name + "' already exists");
        user.errors.name = "User already exists";

        signup.render(res, user);
      }

    });

  });

}
