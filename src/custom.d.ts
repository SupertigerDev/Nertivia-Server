import { ChannelType } from "gm";
import socketIO from "socket.io";
import { CacheUser } from "./cache/User.cache";
import { OAuth2Client } from 'google-auth-library';
import { ServerMemberCache } from "./cache/ServerMember.cache";

declare global {
  namespace Express {
    export interface Request {
      io: socketIO.Server,
      userIp: string,
      user: CacheUser,
      uploadFile: uploadFile,
      rateLimited: boolean,
      channel: Channel,
      member: ServerMemberCache
      permErrorMessage?: string,
      server: Server
      oAuth2Client: OAuth2Client
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


interface uploadFile {
  file: any
  message: string
}
interface Channel {
  _id: string,
  name?: string
  type: ChannelType
  server_id?: string
  channelId: string,
  server: Server
  recipients: any[]
  rateLimit?: number
}
interface Server {
  server_id: string
  _id: string
}