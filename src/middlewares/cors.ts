import cors from "cors";

export default cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      JSON.parse(process.env.ALLOWED_ORIGINS).indexOf(origin) === -1 &&
      !JSON.parse(process.env.ALLOWED_ORIGINS)
    ) {
      callback(null, false);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
});
