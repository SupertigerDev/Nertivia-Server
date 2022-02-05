import { jsonToHtml, JsonInput } from 'jsonhtmlfyer';
import { FilterQuery } from 'mongoose';
import { Channel } from '../custom';
import { MessageQuote } from '../models/MessageQuotes';
import { Message, Messages } from '../models/Messages';
import { User } from '../models/Users';
import { MESSAGE_CREATED, MESSAGE_UPDATED } from '../ServerEventNames';
import { getIOInstance } from '../socket/instance';
import { sendPushNotification } from '../utils/sendPushNotification';
import { createURLEmbed } from '../utils/URLEmbed';
import { zip } from '../utils/zip';
import { getChannelById, updateLastMessaged as updateLastMessagedChannel } from './Channels';
import * as MessageQuotes from './MessageQuotes';
import { insertNotification } from './Notifications';
import { updateMemberLastSeen } from './ServerMembers';
import { getUsersByIds } from './Users';


type OneOf<T extends Record<string, unknown>> = { [K in keyof T]: Record<K, T[K]> & { [U in Exclude<keyof T, K>]?: T[U] } }[keyof T]


const messageSelect = 'creator message messageID quotes';
const messagePopulate = [
  {
    path: "quotes",
    select: "creator message messageID",
    populate: {
      path: "creator",
      select: "avatar username id tag admin -_id",
      model: "users"
    }
  },
  {
    path: "creator",
    select: "username id avatar"
  }
];

export const getMessagesByIds = async (messageIds: string[], channelId?: string) => {
  if (!messageIds.length) return [];
  const filter: FilterQuery<Message> = { messageID: { $in: messageIds } }
  if (channelId) filter.channelID = channelId;
  return Messages
    .find(filter)
    .select(messageSelect)
    .populate(messagePopulate);
}
export const getMessageByObjectId = (objectId: string) => {
  return Messages
    .findById(objectId)
    .select(messageSelect)
    .populate(messagePopulate);
}

interface Button { name: string, id: string };

type CreateMessageArgs = {
  tempId?: string,
  userObjectId: string;
  channelId: string;
  buttons?: Button[];
  socketId?: string;
} & OneOf<{
  htmlEmbed: JsonInput;
  content: string;
  file: any;
}> & OneOf<{
  channel: any;
  channelId: any;
}> & OneOf<{
  creator: any;
}>;

type EditMessageArgs = Partial<CreateMessageArgs> & {messageId: string};

export const editMessage = async (data: EditMessageArgs) => {

  const oldMessage = await Messages.findOne({messageID: data.messageId});
  if (!oldMessage) throw {status: 404, message: "Message not found."}
  if (oldMessage.creator.toString() !== data.creator.toString()) throw {status: 404, message: "Cannot edit others messages."}

  const [content, contentError] = validateMessageContent(data, false);
  if (contentError) throw { statusCode: 403, message: contentError };

  const [buttons, buttonError] = validateButtons(data.buttons);
  const [base64HtmlEmbed, htmlEmbedError] = validateHtmlEmbed(data.htmlEmbed);

  if (buttonError) throw { statusCode: 403, message: buttonError };
  if (htmlEmbedError) throw { statusCode: 403, message: htmlEmbedError };

  const userMentionIds = extractUserMentionIds(content);
  const userMentions = await getUsersByIds(userMentionIds);
  const userMentionObjectIds = userMentions.map(user => user._id);

  const {quoteObjectIds, quotes} = await saveQuoteMentions(content, data);



  let message: Partial<Message> = {
    timeEdited: Date.now(),
    // add to object if exists.
    ...(content && {message: content}),
    ...(base64HtmlEmbed && {htmlEmbed: base64HtmlEmbed}),
    ...(data.file && {files: [data.file]}),
    ...(quoteObjectIds.length && {quotes: quoteObjectIds}),
    ...(userMentionObjectIds.length && {mentions: userMentionObjectIds}),
    ...(buttons?.length && {buttons})
  };

  await oldMessage.updateOne({
    $set: message,
    $unset: {embed: 1}
  })


  message.channelID = oldMessage.channelID
  message.messageID = oldMessage.messageID;
  message.quotes = quotes;
  message.creator = {
    id: data.creator.id,
    username: data.creator.username,
    tag: data.creator.tag,
    avatar: data.creator.avatar,
    badges: data.creator.badges,
    bot: data.creator.bot,
  };
  message.created = oldMessage.created;

  message.mentions = userMentions;

  return new Promise(async resolve => {
    
    resolve(message);

    // emit message to channel
    emitToChannel({
      channel: data.channel,
      user: data.creator,
      eventName: MESSAGE_UPDATED,
      data: {...message, embed: 0},
      excludedSocketId: data.socketId,
      excludeSavedNotes: true,
    })


    const embed = await addEmbedIfExists(message);
    if (!embed) return;

    // emit embed to channel
    const embedResponseData = {
      embed,
      channelID: message.channelID,
      messageID: message.messageID,
      replace: false
    }

    emitToChannel({
      channel: data.channel,
      user: data.creator,
      eventName: MESSAGE_UPDATED,
      data: embedResponseData,
      excludedSocketId: data.socketId,
      excludeSavedNotes: true,
    })
  })
}
export const createMessage = async (data: CreateMessageArgs) => {

  const [content, contentError] = validateMessageContent(data);
  if (contentError) throw { statusCode: 403, message: contentError };

  const [buttons, buttonError] = validateButtons(data.buttons);
  const [base64HtmlEmbed, htmlEmbedError] = validateHtmlEmbed(data.htmlEmbed);

  if (buttonError) throw { statusCode: 403, message: buttonError };
  if (htmlEmbedError) throw { statusCode: 403, message: htmlEmbedError };

  const userMentionIds = extractUserMentionIds(content);
  const userMentions = await getUsersByIds(userMentionIds);
  const userMentionObjectIds = userMentions.map(user => user._id);

  const {quoteObjectIds, quotes} = await saveQuoteMentions(content, data);



  let message: Partial<Message> = {
    channelID: data.channelId,
    messageID: "placeholder",
    creator: data.userObjectId,
    // add to object if exists.
    ...(content && {message: content}),
    ...(base64HtmlEmbed && {htmlEmbed: base64HtmlEmbed}),
    ...(data.file && {files: [data.file]}),
    ...(quoteObjectIds.length && {quotes: quoteObjectIds}),
    ...(userMentionObjectIds.length && {mentions: userMentionObjectIds}),
    ...(buttons?.length && {buttons})
  };

  const createdMessage = await Messages.create(message);

  message.messageID = createdMessage.messageID;
  message.quotes = quotes;
  message.creator = {
    id: data.creator.id,
    username: data.creator.username,
    tag: data.creator.tag,
    avatar: data.creator.avatar,
    badges: data.creator.badges,
    bot: data.creator.bot,
  };
  message.created = createdMessage.created;

  message.mentions = userMentions;

  return new Promise(async resolve => {
    const messageWithTempId = {...message, tempID: data.tempId}
    
    resolve(messageWithTempId);

    // emit message to channel
    emitToChannel({
      channel: data.channel,
      user: data.creator,
      eventName: MESSAGE_CREATED,
      data: messageWithTempId,
      excludedSocketId: data.socketId,
      excludeSavedNotes: true,
    })


    await updateLastSeen({
      channelId: data.channelId,
      memberObjectId: data.creator._id,
      serverObjectId: data.channel?.server?._id
    });

    const isSavedNotes = data.creator.id === data.channel.recipients?.[0]?.id;
    // for DM channels, they are notifications
    // for Server channels, these are used for mentions.
    !isSavedNotes && insertNotification({
      channelId: data.channelId,
      messageId: message.messageID!,
      senderObjectId: data.creator._id,
      mentionUserObjectIds: userMentionObjectIds,
      recipientUserId: data.channel.recipients?.[0]?.id,
      serverObjectId: data.channel.server?._id
    })

    // Sends firebase push notification.
    !isSavedNotes && sendPushNotification({
      channel: data.channel,
      message: message as Message,
      sender: data.creator,
      recipient: data.channel.recipients?.[0]?.id,
      serverId: data.channel.server?.server_id
    })

    const embed = await addEmbedIfExists(message);
    if (!embed) return;

    // emit embed to channel
    const embedResponseData = {
      embed,
      channelID: message.channelID,
      messageID: message.messageID,
      replace: false
    }

    emitToChannel({
      channel: data.channel,
      user: data.creator,
      eventName: MESSAGE_UPDATED,
      data: embedResponseData,
      excludedSocketId: data.socketId,
      excludeSavedNotes: true,
    })
  })
}



interface UpdateLastSeenOptions {
  serverObjectId?: string
  memberObjectId?: string
  channelId: string
}
// update last seen in timestamp.
// for dm channels: this is used to move the user to the top of the list when sending a message.
// for server channels, this is used to determine whether the user has a notification or not by comparing the "lastMessaged" in the channel and "lastSeen" in the server member.
async function updateLastSeen(options: UpdateLastSeenOptions ) {
  const date = await updateLastMessagedChannel(options.channelId);
  if (!options.serverObjectId || !options.memberObjectId) return;
  await updateMemberLastSeen({
    serverObjectId: options.serverObjectId,
    memberObjectId: options.memberObjectId,
    channelId: options.channelId,
    date,
  })
}

interface EmitOptions {
  channel: Channel,
  user: User,
  eventName: string,
  data: any,
  excludedSocketId?: string
  excludeSavedNotes?: boolean // default: false
}

// emit to channel (EG: message sent)
async function emitToChannel(options: EmitOptions) {
  const io = getIOInstance();

  // if server channel
  if (options.channel.server) {
    let room = io.in('server:' + options.channel.server.server_id)
    if (options.excludedSocketId) room = room.except(options.excludedSocketId);
    room.emit(options.eventName, options.data)
    return;
  }

  // if dm channel
  const isSavedNotes = options.user.id === options.channel.recipients[0].id;
  const shouldExcludeSavedNotes = options.excludeSavedNotes ? isSavedNotes : false; 

  if (!shouldExcludeSavedNotes) io.in(options.channel.recipients[0].id).emit(options.eventName, options.data);
  let room = io.in(options.user.id);
  if (options.excludedSocketId) room = room.except(options.excludedSocketId);
  room.emit(options.eventName, options.data)
}

const urlRegex = new RegExp(
  "(^|[ \t\r\n])((http|https):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))");

// update message with the embed if it exists.
async function addEmbedIfExists(message: Partial<Message>)  {
  if (!message.message) return;
  const url = message.message.match(urlRegex)?.[0].trim();
  if (!url) return;
  const [embed, error] = await createURLEmbed(url);
  if (error || !embed) return;
  await Messages.updateOne({messageID: message.messageID}, {embed: embed});
  return embed;
}

// insert quotes to database.
async function saveQuoteMentions(content: string | null, data: Partial<CreateMessageArgs>) {
  if (!content) return {quoteObjectIds: [], quotes: []};
  const messageMentionIds = extractQuoteMentionIds(content);
  const channel = data.channelId ? await getChannelById(data.channelId) : data.channel;
  const messages = await getMessagesByIds(messageMentionIds, channel.channelID);
  if (!messages.length) return {quoteObjectIds: [], quotes: []};
  const quotes: MessageQuote[] = messages.map(message => {
    return {
      creator: message.creator,
      message: message.message,
      messageID: message.messageID,
      quotedChannel: channel._id
    }
  })
  const quoteObjectIds = await MessageQuotes.insertQuotes(quotes);
  return {quoteObjectIds, quotes}
} 

// validates the message content and returns a validated message content.
function validateMessageContent(data: Partial<CreateMessageArgs>, isContentRequired = true): [string | null, string | null] {
  if (isContentRequired && !data.content?.trim() && !data.file && !data.htmlEmbed) return [null, "Content is required."];
  if (!data.content) return [null, null];
  if (data.content.length > 5000) return [null, "Message content must contain less than 5,000 characters."]
  return [data.content.trim(), null];
}

const oldUserMentionRegex = /<@([\d]+)>/g; // <@id>
const newUserMentionRegex = /\[@:([\d]+)]/g; // [@:id]

// extracts all <@123> and [@:123] from the message.
function extractUserMentionIds(content: string | null): string[] {
  if (!content) return [];

  // old user mention format: <@id>
  const oldMentions = matchAllRegexGroups(oldUserMentionRegex, content);

  // new mention format: [@:id]
  const newMentions = matchAllRegexGroups(newUserMentionRegex, content);

  // merge and remove duplicates
  const mentionIds = removeDuplicatesFromArray([...oldMentions, ...newMentions])
  return mentionIds;
}

const quoteMentionRegex = /<m([\d]+)>/g; // <m123>

// extracts all all <m123> from the message. These are message ids.
function extractQuoteMentionIds(content: string | null): string[] {
  if (!content) return [];

  const mentionIds = matchAllRegexGroups(quoteMentionRegex, content);

  // remove duplicates
  const uniqueMentionIds = removeDuplicatesFromArray(mentionIds)
  return uniqueMentionIds;
}


// match groups of regular expressions and return an array of strings.
function matchAllRegexGroups(regex: RegExp, content: string): string[] {
  const matches = content.matchAll(regex);
  const matchedArr: string[] = [];
  for (const match of matches) {
    matchedArr.push(match[1])
  }
  return matchedArr;
}

// remove duplicates from string array
function removeDuplicatesFromArray(values: string[]): string[] {
  return [...new Set(values)];
}


// validates the buttons and returns a clean array of buttons.
function validateButtons(buttons: Button[] | undefined): [Button[] | null, string | null] {
  if (!buttons || !buttons?.length) return [[], null];

  let validatedButtons: Button[] = [];

  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];

    if (!button.id) return [null, "Button id at index " + i + " is missing."];
    if (button.id.length > 40) return [null, "Button id at index " + i + " must be less than 40 characters."];
    if (button.id.match(/[^A-Za-z0-9-]+/)) return [null, "Button id at index " + i + " must contain alphanumeric characters and dashes."];

    if (!button.name || !button.name.trim()) return [null, "Button name at index " + i + " is missing"];
    if (button.name.trim().length > 40) return [null, "Button name at index" + i + " must be less than 40 characters."];

    validatedButtons.push({ id: button.id, name: button.name });
  }
  return [validatedButtons, null];
}

// validates the html embed and returns the html embed in base64 format.
function validateHtmlEmbed(htmlEmbed: any) {
  if (!htmlEmbed || !htmlEmbed) return [null, null];
  if (typeof htmlEmbed !== "object") return [null, "htmlEmbed must be an object."];

  const htmlEmbedStringified = JSON.stringify(htmlEmbed);

  if (htmlEmbedStringified.length > 5000) return [null, "htmlEmbed must be less than 5000 characters."];
  try {
    jsonToHtml(htmlEmbed);
    return [zip(htmlEmbedStringified), null];
  } catch (err: any) {
    return [null, err.message];
  }
}
