const emitToAll = require("./emitToAll");

module.exports = function emitStatus(uniqueID, id, status, io, emitOffline = true, customStatus, connected = false) {
    // dont emit if the status is offline (0)
    if (emitOffline || (!emitOffline && status !== 0)) {
      let payload = { uniqueID, status}
      if (connected) {
        payload.custom_status = customStatus
        payload.connected = true
      } 
      emitToAll("userStatusChange", id, payload, io);
    }

    // send owns status to every connected device 
    io.in(uniqueID).emit('multiDeviceStatus', { status });
  }
