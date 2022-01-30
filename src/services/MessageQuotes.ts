import { MessageQuote, MessageQuotes } from "../models/MessageQuotes";

export const insertQuotes = async (quotes: MessageQuote[]) => {
  if (!quotes.length) return [];
  const messageQuotes = await MessageQuotes.insertMany(quotes);
  return messageQuotes;
}