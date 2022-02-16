
export const authenticatedUserString = (userId: string) => `user:${userId}`;

// unique array of socket ids by user id.
export const userSocketIdSet = (userId: string) => `userSocketIds:${userId}`;

// get user id by socket id.
export const socketUserIdString = (socketId: string) => `socketUserId:${socketId}`;