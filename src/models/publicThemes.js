const {
  Schema,
  model,
} = require("mongoose");


const publicThemesSchema = new Schema({
  id: {type: String, required: true},
  css: {type: String, required: true},
  updatedCss: {type: String, required: false}, // When the creator updates their css, it will be added here for me to approve them.
  description: {type: String},
  created: {type: Number, default: 0},
  approved: {type: Boolean, default: false},
  theme: { type: Schema.Types.ObjectId, ref: 'themes' },
  screenshot: {type: String},
  creator: { type: Schema.Types.ObjectId, ref: 'users' },
  stars: {type: Number, default: 0,}
})


publicThemesSchema.pre('save', async function(next) {
  // Date created
  this.created = Date.now();
  next();
})


module.exports = model('public_themes', publicThemesSchema);