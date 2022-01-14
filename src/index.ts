import cluster from 'cluster';
const numCPUs = require('os').cpus().length;
import { getRedisInstance, redisInstanceExists } from "./redis/instance";
import { getIOInstance } from "./socket/instance";
import app from './app';
import mongoose from "mongoose";
import dotenv from 'dotenv';
import { Log } from './Log';
dotenv.config();
// header only contains ALGORITHM & TOKEN TYPE (https://jwt.io/)
process.env.JWT_HEADER = "eyJhbGciOiJIUzI1NiJ9.";

main();

function main() {
	if (process.env.DEV_MODE === "true") {
		start();
		return;
	}
	if (cluster.isMaster) {
		console.log("Master PID: ", process.pid);
	
		for (let i = 0; i < numCPUs; i++) {
			cluster.fork();
		}
		cluster.on('exit', (worker, code, signal) => {
			console.log(`Worker Died! PID:`, process.pid);
		});
		return;
	}
	start();
}

function start() {
	console.log(`Worker Started! PID:`, process.pid);

	let isListening = false;

	connectMongoDB();
	
	function connectMongoDB() {
		Log.info("Connecting to MongoDB...")
		const mongoOptions: mongoose.ConnectionOptions = {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
			useCreateIndex: true
		};
		mongoose.connect(process.env.MONGODB_ADDRESS, mongoOptions, err => {
			if (err) throw err;
			Log.info("Connected!")
			connectRedis();
		})
	}
	function connectRedis() {
		Log.info("Connecting to Redis...")
		if (redisInstanceExists()) return;
		const client = getRedisInstance({
			host: process.env.REDIS_HOST,
			password: process.env.REDIS_PASS,
			port: parseInt(process.env.REDIS_PORT)
		});
		if (!client) return;
		client.on("ready", () => {
			Log.info("Connected!")
			client.flushall();
			startServer();
		});
		client.on("error", err => {
			throw err;
		})
	}
	function startServer() {
		if (isListening) return;
		Log.info("Starting server...");
		const server = app();

		const socketIO = require('./socketIO');

		getIOInstance().on("connection", socketIO);

		const port = process.env.PORT || 8000;
		server.listen(port, function () {
			Log.info("Listening on port", port);
		});
	}

}