
import mongoose from "mongoose";

export default mongoose.model("Shop", new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  min: Number,
  max: Number
}));
