import config from "../config";
import cors from "cors";

export default cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      config.allowedOrigins.indexOf(origin) === -1 &&
      !config.allowAllOrigins
    ) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      callback(new Error(msg), false);
    } else {
      callback(null, true);
    }
  },
  credentials: true
});
