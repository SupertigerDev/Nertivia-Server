import jwt from 'jsonwebtoken';

const verify = (token: string): Promise<string> => {
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
const sign = (data: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    jwt.sign(data, process.env.JWT_SECRET, (err, token) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(token as string);
    });
  });
}

export const decodeToken = async (token: string) => {
  const decoded = await verify(token);
  const split = decoded.split("-");

  const id = split[0];
  const passwordVersion = split[1] ? parseInt(split[1]) : 0;
  return { id, passwordVersion };
}
export const signToken = async (userId: string, passwordVersion?: number | undefined) => {
  let payload = "";

  if (passwordVersion !== undefined) {
    payload = await sign(`${userId}-${passwordVersion}`);
  } else {
    payload = await sign(userId);
  }

  return payload
    .split(".")
    .splice(1)
    .join(".");
}