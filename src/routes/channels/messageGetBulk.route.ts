const mongoose = require("mongoose");
import { Request, Response, Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { channelVerify } from '../../middlewares/channelVerify.middleware';
import {rateLimit} from '../../middlewares/rateLimit.middleware';
import {MessageReactions} from '../../models/MessageReactions';

import {Messages} from '../../models/Messages'

export const messageGetBulk = (Router: Router) => {
  Router.route("/:channelId/messages").get(
    authenticate({allowBot: true}),
    rateLimit({name: 'messages_load', expire: 60, requestsLimit: 120 }),
    channelVerify,
    route
  );
  
}

async function route (req: Request, res: Response){
  const { channelId } = req.params;
  const continueMessageID = req.query.continue as string;
  const beforeMessageID = req.query.before as string;
  const aroundMessageID = req.query.around as string;

  const populate = [{
    path: "creator",
    select: "avatar username id tag badges -_id bot"
  }, {
    path: "mentions",
    select: "avatar username id tag -_id"
  }, {
    path: "quotes",
    select: "creator message messageID id -_id",
    populate: {
      path: "creator",
      select: "avatar username id tag -_id",
      model: "users"
    }
  }
  ]
  const select = "-embed._id"

  // Get messages
  let messages;
  if (continueMessageID) {
    // check if continue param is entered
    const continueFromMessage = await Messages.findOne({
      messageID: continueMessageID
    }).select("_id");
    if (!continueFromMessage) {
      return res.status(403).json({
        status: false,
        message: "continue message was not found."
      });
    }
    messages = await Messages.find({
      channelId: channelId,
      _id: {
        $lt: continueFromMessage._id
      }
    })
      .sort({
        _id: -1
      })
      .populate(populate)
      .select(select)
      .limit(50)
      .lean();
  } else if (beforeMessageID) {
    // check if continue param is entered
    const beforeFromMessage = await Messages.findOne({
      messageID: beforeMessageID
    }).select("_id");
    if (!beforeFromMessage) {
      return res.status(403).json({
        status: false,
        message: "before message was not found."
      });
    }
    messages = await Messages.find({
      channelId: channelId,
      _id: {
        $gt: beforeFromMessage._id
      }
    })
      .populate(populate)
      .select(select)
      .limit(50)
      .lean();
  } else if (aroundMessageID) {
    // check if continue param is entered

    const message = await Messages.findOne({
      messageID: aroundMessageID
    }).select("_id");
    if (!message) {
      return res.status(403).json({
        status: false,
        message: "continue message was not found."
      });
    }

    let above = await Messages.find({
      channelId: channelId,
      _id: {
        $lte: message._id
      }
    }).sort({
      _id: -1
    }).limit(25).populate(populate).select(select).lean();

    let bottom = await Messages.find({
      channelId: channelId,
      _id: {
        $gt: message._id
      }
    }).limit(25).populate(populate).select(select).lean();


    if (above.length === 25 && bottom.length < 25) {
      above = await Messages.find({
        channelId: channelId,
        _id: {
          $lte: message._id
        }
      }).sort({
        _id: -1
      }).limit(50 - bottom.length).populate(populate).select(select).lean();

    } else if (bottom.length === 25 && above.length < 25) {
      bottom = await Messages.find({
        channelId: channelId,
        _id: {
          $gt: message._id
        }
      }).limit(50 - above.length).populate(populate).select(select).lean();
    }



    messages = [...bottom.reverse(), ...above];
  } else {
    messages = await Messages.find(
      {
        channelId: channelId
      },
      "-__v -_id"
    )
      .populate(populate).select(select)
      .sort({
        _id: -1
      })
      .limit(50)
      .lean();
  }

  const messageIDs = messages.map(message => message.messageID);

  const allReactions = await MessageReactions.aggregate([
    { "$match": { "messageID": { "$in": messageIDs } } },
    {
      $addFields: {
        reacted: {
           $in: [mongoose.Types.ObjectId(req.user._id), '$reactedBy'] // it works now
         }
      }  
    },
    {
      $project: {
        _id: 0,
        emojiID: 1,
        unicode: 1,
        gif: 1,
        reacted: 1,
        messageID: 1,
        count: { $size: "$reactedBy" }

      }
    }
  ])

  if (allReactions.length) {
    messages = messages.map(message => {
    const reactions: any = [] 
    allReactions.forEach(reaction => {
        if (reaction.messageID !== message.messageID) return;
        reactions.push({...reaction, messageID: undefined})
      })
      if (!reactions.length) return message;
      return {...message, reactions}
    })
  }



  return res.json({
    status: true,
    channelId: channelId,
    messages
  });
};



//msg 6664198087029821440
