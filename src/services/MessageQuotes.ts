import mongoose from "mongoose";
import { MessageQuote, MessageQuotes } from "../models/MessageQuotes";

export const insertQuotes = async (quotes: MessageQuote[]): Promise<mongoose.Types.ObjectId[]> => {
  if (!quotes.length) return [];
  const messageQuotes = await MessageQuotes.insertMany(quotes);
  return messageQuotes.map(quote => quote._id);
}