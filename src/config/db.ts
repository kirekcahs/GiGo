import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  throw new Error("MongoDB is not found");
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
