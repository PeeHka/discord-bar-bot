
import mongoose from "mongoose";

export default mongoose.model("Title", new mongoose.Schema({
  name: String,
  drinks: Number,
  roleId: String
}));
