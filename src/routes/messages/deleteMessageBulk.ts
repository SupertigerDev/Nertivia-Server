import { Message } from './../../models/Messages';
import { NextFunction, Request, Response } from "express";
import { Document, FilterQuery, LeanDocument } from "mongoose";
import { Messages } from "../../models/Messages";


module.exports = async (req: Request, res: Response, next: NextFunction) => {
  const { channelID } = req.params;
  const { ids } = req.body;
  const channel = req.channel;
  const server = channel.server;
  const io = req.io;

  if (!Array.isArray(ids)) {
    return res.status(403).json({ message: "Please provide an array of ids." });
  }

  if (ids.length < 2 || ids.length > 200) {
    return res
      .status(403)
      .json({ message: "Please provide more than 1 and less than 200 ids." });
  }

  let messageIds: string[] = [];

  // if im in dms or not admin in servers, im only allowed to delete my own messages.
  if (!server || req.permErrorMessage) {
    messageIds = await findMessages({
      messageID: { $in: ids },
      creator: req.user._id,
      channelID,
    });
  }

  // if im in a server and im the admin, delete anyones message
  if (server && !req.permErrorMessage) {
    messageIds = await findMessages({
      messageID: { $in: ids },
      channelID,
    });
  }

  await Messages.deleteMany({messageID: { $in: messageIds}})

  const response = {
    channelId: channelID,
    messageIds,
  }


  res.json(response)

  if (!messageIds.length) return;

  if (!server) {
    io.in(req.user.id).emit("delete_message_bulk", response);
    io.in(channel.recipients[0].id).emit("delete_message_bulk", response);
  }
  if (server) {
    io.in("server:" + server.server_id).emit("delete_message_bulk", response);
  }
};

async function findMessages(filter: FilterQuery<Message>) {
  return messagesToIds(await Messages.find(filter, {_id: 0}).limit(200).select("messageID").lean());
}

function messagesToIds(messages: LeanDocument<Message & Document<any, any>>[]) {
  return messages.map((message) => message.messageID)
}
