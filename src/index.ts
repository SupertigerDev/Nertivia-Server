import { getRedisInstance, redisInstanceExists } from "./redis/instance";
import { getIOInstance } from "./socket/instance";
import app from './app';
import mongoose from "mongoose";
import config from './config'


const mongoOptions: mongoose.ConnectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
};

let httpServerInitialized = false;

mongoose.connect(config.mongoDBAddress, mongoOptions, function(err) {
  if (err) throw err;
	console.log("\x1b[32m" + "MongoDB> " + "\x1b[1m" + "Connected!\x1b[0m");
	connectToRedis();
});

function connectToRedis() {
	if (redisInstanceExists()) return;
	const client = getRedisInstance(config.redis);
	if (!client) return;
	client.on("ready", () => {
		client.flushall();
		console.log("\x1b[33mRedis>\x1b[1m Connected!\x1b[0m");
		startHTTPServer();
	});
	client.on("error", err => {
		throw err;
	})
}


function startHTTPServer() {
	if (httpServerInitialized) return;
	httpServerInitialized = true;
	const server = app();

	
	const socketIO = require('./socketIO');

	getIOInstance().on("connection", socketIO);




	server.listen(config.port || 80, function(){
			console.log("\x1b[36mHTTP & Socket>\x1b[1m listening on *:"+ (config.port || 80) + "\x1b[0m");
	});

}
