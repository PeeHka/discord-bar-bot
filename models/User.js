
import mongoose from "mongoose";

export default mongoose.model("User", new mongoose.Schema({
  userId: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  totalDrinks: { type: Number, default: 0 },
  inventory: { type: [String], default: ["beer"] },
  cooldowns: {
    drink: { type: Number, default: 0 },
    dice: { type: Number, default: 0 },
    casino: { type: Number, default: 0 }
  },
  title: { type: String, default: null },
  lastActions: { type: [Number], default: [] }
}));
