
import mongoose from "mongoose";

export default mongoose.model("Config", new mongoose.Schema({
  ownerId: String,
  cooldowns: {
    drink: { type: Number, default: 30 },
    dice: { type: Number, default: 20 },
    casino: { type: Number, default: 60 }
  },
  event: {
    active: { type: Boolean, default: false },
    multiplier: { type: Number, default: 2 }
  }
}));
