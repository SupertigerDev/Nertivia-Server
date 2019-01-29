app = require('./app');

socketIO = require('./socketIO');

const {http, io} = app;

io.on('connection', socketIO);


http.listen(80, function(){
    console.log('listening on *:80');
});