import cluster from 'cluster';
const numCPUs = require('os').cpus().length;
import { getRedisInstance, redisInstanceExists } from "./redis/instance";
import { getIOInstance } from "./socket/instance";
import app from './app';
import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();
// header only contains ALGORITHM & TOKEN TYPE (https://jwt.io/)
process.env.JWT_HEADER = "eyJhbGciOiJIUzI1NiJ9.";


if (cluster.isMaster) {
	console.log("Master PID: ", process.pid);

	// run workers
	for (let i = 0; i < (process.env.DEV_MODE === "true" ? 1 : numCPUs); i++) {
	// for (let i = 0; i < 4; i++) {
		cluster.fork();
	}
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker Died! PID:`, process.pid);
  });
} else {
	start();
}

function start() {
	const mongoOptions: mongoose.ConnectionOptions = {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
		useCreateIndex: true
	};

	let httpServerInitialized = false;

	mongoose.connect(process.env.MONGODB_ADDRESS, mongoOptions, function (err) {
		if (err) throw err;
		console.log("\x1b[32m" + "MongoDB> " + "\x1b[1m" + "Connected!\x1b[0m");
		connectToRedis();
	});

	function connectToRedis() {
		if (redisInstanceExists()) return;
		const client = getRedisInstance({
			host: process.env.REDIS_HOST,
			password: process.env.REDIS_PASS,
			port: parseInt(process.env.REDIS_PORT)
		});
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



		const port = process.env.PORT || 8000;
		server.listen(port, function () {
			console.log("\x1b[36mHTTP & Socket>\x1b[1m listening on *:" + (port) + "\x1b[0m");
		});

	}
	console.log(`Worker Started! PID:`, process.pid);

}