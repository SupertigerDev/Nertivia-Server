const friends = require("../models/friends");
const users = require("../models/users");
const channels = require("../models/channels");

module.exports = {
  post: async (req, res, next) => {
    const {recipient_id} = req.params;
    

    // Check if recipient_id is valid
    const recipient = await users.findOne({uniqueID: recipient_id});
    if (!recipient) {
      return res.status(403)
      .json( { status: false, message: "recipient_id is invalid."} );
    }
    
    // check if channel exists
    let channel = await channels.findOne({recipients: recipient._id, creator: req.user._id}).populate({
      path: 'recipients',
      select: '-_id -id -password -__v -email -friends -status -created -lastSeen'
    });
    if ( channel ){
      return res
        .json( { status: true, channel } );
    }

    // check if channel exists
    channel = await channels.findOne({recipients: req.user._id, creator: recipient._id}).populate({
      path: 'recipients',
      select: '-_id -id -password -__v -email -friends -status -created -lastSeen'
    });

    // create channel because it doesnt exist.
    let channelID;

    if (channel) {
      channelID = channel.channelID;
    } else {
      channelID = generateNum(19);
    }

    let newChannel = await channels.create({
      channelID,
      creator: req.user._id,
      recipients: [recipient._id],
      lastMessaged: Date.now()
    })
    newChannel = await channels.findOne(newChannel).populate({
      path: 'recipients',
      select: '-_id -id -password -__v -email -friends -status -created -lastSeen'
    });
    
    res
    .json( { status: true, channel: newChannel } );
    // sends the open channel to other clients.
    req.io.in(req.user.uniqueID).emit('channel:created', {channel: newChannel});
  },

  delete: async (req, res, next) => {
    const {channelID} = req.params;
    
  },
}

function generateNum(n) {
  var add = 1, max = 12 - add;   // 15 is the min safe number Math.random() can generate without it starting to pad the end with zeros.   

  if ( n > max ) {
      return generateNum(max) + generateNum(n - max);
  }
  max = Math.pow(10, n+add);
  var min = max/10; // Math.pow(10, n) basically
  var number = Math.floor( Math.random() * (max - min + 1) ) + min;

  return ("" + number).substring(add); 
}