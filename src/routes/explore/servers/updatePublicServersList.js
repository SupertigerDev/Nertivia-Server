import {Servers} from '../../../models/Servers';
import {PublicServers} from '../../../models/PublicServers';


module.exports = async (req, res, next) => {
  const {server_id} = req.params;
  const {description} = req.body;

  if (description.length > 150) return res.status(403).json({message: 'description must be shorter than 150 characters.'});

  if (!server_id) return res.status(403).json({message: 'server_id missing.'});
  
  // get server by id
  const server = await Servers.findOne({server_id}).select('name server_id creator').lean(); 
  // if servers exists
  if (!server) return res.status(404).json({message: 'server does not exist.'});
  // if server creator is by request
  if (server.creator.toString() != req.user._id) return res.status(404).json({message: 'This server is not yours.'});

  // check if exists
  const publicList = await PublicServers.findOne({server: server._id});
  if (!publicList) return res.status(404).json({message: 'Server does not exist in the public list.'});



  // update server
  const add = await PublicServers.updateOne({
    server: server._id,
  },
  {
    $set: {description}
  });


  res.end();
};
