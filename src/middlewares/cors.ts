import config from "../config";
import cors from "cors";

export default cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      config.allowedOrigins.indexOf(origin) === -1 &&
      !config.allowAllOrigins
    ) {
      callback(null, false);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
});
