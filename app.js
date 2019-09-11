const config = require('./config.js');
process.env.REDISCLOUD_URL = config.redisURL;
const redisClient = require('redis-connection')();
redisClient.flushall();
const express = require('express');
const app = express();
const http = require('http').Server(app);
const redis = require('redis');
const client  = redis.createClient({url: config.redisURL});
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const vhost = require('vhost');
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const cors = require('cors');

const io = require('socket.io')(http, {
  perMessageDeflate: false,
  handlePreflightRequest: function (req, res) {
    var headers = {
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': config.allowedOrigins[0],
      'Access-Control-Allow-Credentials': true
    };
    res.writeHead(200, headers);
    res.end();
  }
});

app.set('trust proxy', 1) // trust first proxy

//Middlewares
app.use(bodyParser.json({limit: '10mb'}));
//store socket io
app.use(function(req,res,next){
  req.io = io;
  next();
})

const sessionMiddleware = session({
  secret: config.sessionSecret,
  // create new redis store.
  store: new RedisStore({
    client,
    ttl: 600
  }),
  saveUninitialized: false,
  resave: false
});

// io.use((socket, next) => {
//   sessionMiddleware(socket.request, socket.request.res, next);
// })

app.use(sessionMiddleware);

// Allows certain hosts.
const allowedOrigins = config.allowedOrigins;
app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      callback(new Error(msg), false);
    } else {
      callback(null, true);
    }
  }, credentials: true
}));


//routes
app.use('/api', require('./routes/api'));
app.use(vhost('musica.' + config.domain, express.static('public/musica')))

app.use(vhost('nertivia.' + config.domain, require('./routes/chat')))

app.use('/', express.static('public/supertiger/'))
  



// Connect to MongoDB Database.
mongoose.connect(config.mongoDBAddress, {useNewUrlParser: true}, function (err) {
    if (err) {
        throw err;
    }
    console.log('\x1b[32m' + 'MongoDB> ' + '\x1b[1m' + 'Connected!\x1b[0m')
})

//disable deperacation warnings
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);


module.exports = {
    app, http, io, redisClient
}