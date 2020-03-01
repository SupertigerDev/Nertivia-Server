export default interface Config {
  mongoDBAddress: string,
  jwtSecret: string,
  jwtHeader: string,
  sessionSecret: string,
  redisURL: string,
  reCaptchaKey: string,
  androidReCaptchaKey: string,
  devMode: boolean,
  domain: string | null,
  allowedOrigins: string[],
  googleDrive: GoogleDrive,
  IPs: IPs[],
  port: number | null
  allowAllOrigins: boolean | null
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