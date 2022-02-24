import socketio from "socket.io";

declare global {
  namespace Express {
    export interface Request {
      io: socketio.Server,
      userIP?: string | string[] | undefined,
      user: User,
      uploadFile: uploadFile,
      message_id: string,
      channel: Channel,
      permErrorMessage?: string,
      server: Server
      oauth2Client: any
    }
  }
  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_ADDRESS: string
      JWT_SECRET: string
      JWT_HEADER: string
      SESSION_SECRET: string
      
      REDIS_HOST: string
      REDIS_PORT: string
      REDIS_PASS: string
      
      CAPTCHA_KEY: string
      
      DOMAIN: string
      ALLOWED_ORIGINS: string
      
      SMTP_SERVICE: string
      SMTP_USER: string
      SMTP_PASS: string
      SMTP_FROM: string
      
      FILE_CDN_SECRET: string
      
      DRIVE_CLIENT_ID: string
      DRIVE_CLIENT_SECRET: string
      DRIVE_URL:string
      DRIVE_KEY: string
      
      DEV_MODE: string
    }
  }
}
interface User {
  id: string
  _id: string
  username: string
  tag: string
  avatar: string
  admin: string
  bot?: boolean,
  badges?: number
}

interface uploadFile {
  file: object
  message: string
}
interface Channel {
  _id: string,
  channelId: string,
  server: Server
  recipients: any[]
  rateLimit?: number
}
interface Server {
  server_id: string
  _id: string
}