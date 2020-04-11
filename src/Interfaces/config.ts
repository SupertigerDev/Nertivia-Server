export default interface Config {
  mongoDBAddress: string,
  jwtSecret: string,
  jwtHeader: string,
  sessionSecret: string,
  redis: Redis,
  reCaptchaKey: string,
  androidReCaptchaKey: string,
  devMode: boolean,
  domain: string | null,
  allowedOrigins: string[],
  googleDrive: GoogleDrive,
  IPs: IPs[],
  port: number | null
  allowAllOrigins: boolean | null,
  fileCDNSecret: string,
  nodemailer: Nodemailer
}

export interface Redis {
  host: string,
  port: number,
  password: string,
}

interface Nodemailer {
  service: string,
  user: string,
  pass: string,
  from: string
}
interface IPs {
  domain: string,
  allowedOrigins: string[]
}

interface GoogleDrive {
  client_id: string,
  client_secret: string,
  url: string,
  key: string
}