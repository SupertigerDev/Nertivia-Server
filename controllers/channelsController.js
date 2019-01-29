const friends = require("../models/friends");
const users = require("../models/users");
const channels = require("../models/channels");

module.exports = {
  post: async (req, res, next) => {
    const {channelID} = req.params;
    
    // get current user
    const user = await users.findOne({uniqueID: req.user.uniqueID});
    if ( !user ) {
      return res.status(403)
        .json( { status: false, message: "Something went wrong." } );
    }

    // check if channel exists
    const channel = await channels.findOne({channelID, creator: user}).populate({
      path: 'recipients',
      select: '-_id -id -password -__v -email -friends -status -created -lastSeen'
    });
    if ( channel ){
      return res
        .json( { status: true, channel } );
    }

    // search through friends
    const relationship = await friends.findOne({requester: user.id, channelID}).populate('recipient').lean();
    if ( !relationship ) {
      return res.status(403)
      .json( { status: false, message: "Channel not found."} );
    }
    // create channel
    let newChannel = await channels.create({
      channelID: channelID,
      creator: user,
      recipients: [relationship.recipient._id]
    })
    newChannel = await channels.findOne(newChannel).populate({
      path: 'recipients',
      select: '-_id -id -password -__v -email -friends -status -created -lastSeen'
    });
    
    return res
    .json( { status: true, channel: newChannel } );
  },

  delete: async (req, res, next) => {
    const {channelID} = req.params;
    
  },
}