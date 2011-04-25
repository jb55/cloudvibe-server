
var User = require('./lib/user')
  , logger = require('./lib/logger');

var login = module.exports;

login.model = function(name, password, errors){
  return {
    errors: errors || {}
  , name: name || ""
  , password: password || ""
  }
}

login.render = function(res, model){
  res.render('home/login', { locals: { user: model }, layout: false });
}

login.routes = function(app, db, next) {

  //===--------------------------------------------------------------------===//
  // [POST] /login
  //===--------------------------------------------------------------------===//
  app.post('/login', function(req, res){
    var name = req.body.user.name
      , pass = req.body.user.password
      , model = login.model(name, pass);

    User.login(db, name, pass, function(err, ok){
      if (err || !ok) {
        logger.debug("after login: " + ok);
        model.errors.password = "Invalid password";
        return login.render(res, model)
      }

      next(req, res, model.name);
    });
  });

  //===--------------------------------------------------------------------===//
  // [GET] /login
  //===--------------------------------------------------------------------===//
  app.get('/login', function(req, res){
    var model = login.model("name", "");
    login.render(res, model);
  });

}
