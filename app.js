const config = require('./config.js');
process.env.REDISCLOUD_URL = config.redisURL;
const redisClient = require('redis-connection')();
redisClient.flushall();
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
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
const vhost = require('vhost');
const history = require('connect-history-api-fallback');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose');
const cors = require('cors');


//Middlewares
app.use(bodyParser.json());
app.use(cookieParser());
app.use(function(req,res,next){
  req.io = io;
  next();
})

// Allows certain hosts.
const allowedOrigins = config.allowedOrigins;
app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));


//routes
app.use(vhost('api.' + config.domain, require('./routes/users')));
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


module.exports = {
    app, http, io, redisClient
}