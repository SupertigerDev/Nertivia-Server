const config = require('./config.js');
if (config.redisURL) process.env.REDISCLOUD_URL = config.redisURL;
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
const ipRangeCheck = require("ip-range-check");

const io = require('socket.io')(http, {
  perMessageDeflate: false,
  handlePreflightRequest: function (req, res) {
    var headers = {
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': config.allowedOrigins,
      'Access-Control-Allow-Credentials': true
    };
    res.writeHead(200, headers);
    res.end();
  }
});


const cloudFlareIps = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/12",
  "172.64.0.0/13",
  "131.0.72.0/22",
]

// check if ip is in cloudflare ranges.
app.use((req, res, next) => {
  if (config.devMode) return next();
  if (!ipRangeCheck(req.connection.remoteAddress, cloudFlareIps)) {
    res.status(404).send('<div>You have been IP Banned.</div><div>IP: ' + req.ip + '</div>')
    return;
  }
  next();
})


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
    if(allowedOrigins.indexOf(origin) === -1 && !config.allowAllOrigins){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      callback(new Error(msg), false);
    } else {
      callback(null, {
        maxAge: 600
      });
    }
  }, credentials: true
}));


//routes
app.use('/api', require('./routes/api'));

if (config.domain) {
    app.use(vhost('musica.' + config.domain, express.static('public/musica')))
    app.use(vhost('reddit.' + config.domain, express.static('public/reddit')))

    app.use(vhost('nertivia.' + config.domain, require('./routes/chat')))
    app.use(vhost('nertiviabeta.' + config.domain, require('./routes/chatBeta')))
} else {
    app.use('/musica', express.static('public/musica'))
    app.use('/reddit', express.static('public/reddit'))

    app.use('/nertivia', require('./routes/chat'))
    app.use('/nertiviabeta', require('./routes/chatBeta'))
}

app.use('/', express.static('public/supertiger/'))
  



// Connect to MongoDB Database.
mongoose.connect(config.mongoDBAddress, {useNewUrlParser: true, useUnifiedTopology: true}, function (err) {
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