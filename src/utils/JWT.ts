import jwt from 'jsonwebtoken';

export const verify = (token: string): Promise<String> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err || !decode) {
        reject("Invalid Token!");
        return;
      }
      resolve(decode as unknown as string);
    })
  })
}

export const decodeToken = async (token: string) => {
  const decoded = await verify(token);
  const split = decoded.split("-");

  const id = split[0];
  const passwordVersion = split[1] ? parseInt(split[1]) : 0;
  return {id, passwordVersion};
}