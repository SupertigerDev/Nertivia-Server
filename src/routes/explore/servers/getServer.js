import {PublicServers} from '../../../models/PublicServers';

const servers = require('../../../models/servers');

module.exports = async (req, res, next) => {
  const {server_id} = req.params;

  const server = await servers.findOne({server_id}).select('_id');
  if (!server) return res.status(404).json({message: 'server does not exist.'});


  const serversList = await PublicServers.findOne({server: server._id}, {_id: 0})
    .select('description id created')
    .populate({path: 'server', select: 'name server_id avatar -_id'})
  if (!serversList) return res.status(404).json({message: 'does not exist.'});



  res.json(serversList);

};
