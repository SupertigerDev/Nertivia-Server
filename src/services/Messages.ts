import { jsonToHtml, JsonInput } from 'jsonhtmlfyer';
import { FilterQuery } from 'mongoose';
import { MessageQuote } from '../models/MessageQuotes';
import { Message, Messages } from '../models/Messages';
import { User } from '../models/Users';
import { zip } from '../utils/zip';
import { getChannelById } from './Channels';
import * as MessageQuotes from './MessageQuotes';
import { getUsersByIds } from './Users';



type OneOf<T extends Record<string, unknown>> = { [K in keyof T]: Record<K, T[K]> & { [U in Exclude<keyof T, K>]?: T[U] } }[keyof T]


export const getMessagesByIds = async (messageIds: string[], channelId?: string) => {
  if (!messageIds.length) return [];
  const filter: FilterQuery<Message> = { messageID: { $in: messageIds } }
  if (channelId) filter.channelID = channelId;
  return Messages
    .find(filter)
    .select('creator message messageID quotes')
    .populate([
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
    ])
}


interface Button { name: string, id: string };

type CreateMessageArgs = {
  channelId: string;
  buttons?: Button[];
} & OneOf<{
  htmlEmbed: JsonInput;
  content: string;
  file: any;
}>;

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

  const messageQuotes = await saveQuoteMentions(content, data.channelId);
  
  
}

async function saveQuoteMentions(content: string | null, channelId: string) {
  if (!content) return [];
  const messageMentionIds = extractQuoteMentionIds(content);
  const messages = await getMessagesByIds(messageMentionIds, channelId);
  if (!messages.length) return [];
  const channel = await getChannelById(channelId);
  const quotes: MessageQuote[] = messages.map(message => {
    return {
      creator: message.creator,
      message: message.message,
      messageID: message.messageID,
      quotedChannel: channel
    }
  })
  return await MessageQuotes.insertQuotes(quotes);
} 

// validates the message content and returns a validated message content.
function validateMessageContent(data: CreateMessageArgs): [string | null, string | null] {
  if (!data.content && !data.file && !data.htmlEmbed) return [null, "Content is required."];
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
  if (!buttons || !buttons?.length) return [null, null];

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

(createMessage as any)({ channelId: "1234" }).catch((err: any) => { console.log("yay", err) });