
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


//===----------------------------------------------------------------------===//
// signup.validate
//===----------------------------------------------------------------------===//
signup.validate = function(user) {
  var valid = true;

  if (!User.isValidName(user.name)) {
    user.errors.name = "Invalid username";
    logger.notice("Invalid username '" + user.name + "'");
    valid = false;
  }

  if (user.name.length > 32) {
    user.errors.name = "Username too long";
    logger.notice("Username too long '" + user.name + "'");
    valid = false;
  }

  if (!sutil.validEmail(user.email)) {
    user.errors.email = "Invalid email address";
    logger.notice("Invalid email '" + user.email + "'");
    valid = false;
  }

  if (!user.password) {
    user.errors.password = "You must enter a password";
    valid = false;
  }

  if (user.password != user.confirmpassword) {
    user.errors.password = "Passwords do not match";
    valid = false;
  }

  return valid;
}

//===----------------------------------------------------------------------===//
// Signup routes
//===----------------------------------------------------------------------===//
signup.routes = function(app, db, next) {

  //===--------------------------------------------------------------------===//
  // [GET] /signup
  //===--------------------------------------------------------------------===//
  app.get('/signup', function (req, res){
    var user = signup.model("name", "email");
    signup.render(res, user);
  });

  //===--------------------------------------------------------------------===//
  // [POST] /signup
  //===--------------------------------------------------------------------===//
  app.post('/signup', function (req, res){
    var user = req.body.user;
    user.errors = {};

    if (!signup.validate(user))
      return signup.render(res, user);

    User.register(db, user.name, user.password, function(err, exists){
      if (exists === true) {
        // user already exists
        user.errors.name = "User already exists";
        return signup.render(res, user);
      }

      next(req, res, user.name);
    });

  });

}
