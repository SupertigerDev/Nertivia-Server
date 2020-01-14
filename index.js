const app = require('./app');
const config = require('./config.js');

const socketIO = require('./socketIO');

const {http, io} = app;

let mio = io;
if(!config.domain) mio = mio.of("/nertivia");
mio.on('connection', socketIO);


http.listen(config.port||80, function(){
    console.log("listening on *:"+config.port||80);
});