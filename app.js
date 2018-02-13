var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const {generateMessage, generateLocationMessage} = require('./message');
const {isRealString} = require('./validation');
const {Users} = require('./users');

//Connection to mongoDB
mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

//Routes For Pages
var routes = require('./routes/index');
var people = require('./routes/people');

//Initilization of Express Middleware
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

//View Engine for rendering pages
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'})); //Deafult Layout as set in /views/layout folder
app.set('view engine', 'handlebars');

//BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//Static Folder for Styles
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root;

      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param : formParam,
        msg   : msg,
        value : value
      };
    }
  }));

  // Connect Flash
  app.use(flash());

  // Global Vars
  app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
  });


  io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('join', (params, callback) => {
      if (!isRealString(params.name) || !isRealString(params.room)) {
        callback('Name and room name is required.');
      }

      socket.join(params.room);
      users.removeUser(socket.id);
      users.addUser(socket.id, params.name, params.room);

      io.to(params.room).emit('updateUserList', users.getUserList(params.room));
      socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'));
      socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} has joined`));
      callback();
    });

    socket.on('createMessage', (message, callback) => {
      var user = users.getUser(socket.id);

      if (user && isRealString(message.text)) {
        io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
      }

      callback();
    });

    socket.on('createLocationMessage', (coords) => {
      var user = users.getUser(socket.id);

      if (user) {
        io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));
      }

    });

    socket.on('disconnect', () => {
      var user = users.removeUser(socket.id);

      if (user) {
        io.to(user.room).emit('updateUserList', users.getUserList(user.room));
        io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
      }
    });
  });


  app.use('/', routes);
  app.use('/people', people);

  // Set Port
  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server started on ${port}`);
});
