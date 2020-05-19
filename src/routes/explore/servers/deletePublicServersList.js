const servers = require('./../../../models/servers');
const publicServersList = require("./../../../models/publicServersList");

module.exports = async (req, res, next) => {
  const {server_id} = req.params;

  if (!server_id) return res.status(403).json({message: 'server_id missing.'});
  
  // get server by id
  const server = await servers.findOne({server_id}).select('name server_id creator').lean(); 
  // if servers exists
  if (!server) return res.status(404).json({message: 'server does not exist.'});
  // if server creator is by request
  if (server.creator.toString() != req.user._id) return res.status(404).json({message: 'This server is not yours.'});


  // check if exists
  const publicList = await publicServersList.findOne({server: server._id});
  if (!publicList) return res.status(404).json({message: 'Server does not exist in the public list.'});


  // update server
  const update = await servers.updateOne({_id: server._id}, {$set: {
    public: false
  }})

  // remove Server
  const deleteServer = await publicServersList.deleteOne({
    server: server._id,
  })


  res.end();
};
