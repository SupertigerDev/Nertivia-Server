import {createClient} from 'redis';


export const client = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  },
  password: process.env.REDIS_PASS,
});


export function connect(): Promise<typeof client> {
  return new Promise((resolve, reject)  => {
    client.connect()

    client.on('connect', async () => {
      await client.flushAll()
      resolve(client);
    })
    client.on('error', (err) => {
      reject(err);
    })
    
  })
}

