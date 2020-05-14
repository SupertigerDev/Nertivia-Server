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
      server: Server
      oauth2Client: any
    }
  }
}
interface User {
  uniqueID: string
  _id: string
  username: string
  tag: string
  avatar: string
  admin: string
  bot?: boolean,
}

interface uploadFile {
  file: object
  message: string
}
interface Channel {
  _id: string,
  server: Server
  recipients: any[]
}
interface Server {
  server_id: string
  _id: string
}