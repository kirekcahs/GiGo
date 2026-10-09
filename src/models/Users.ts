import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash?: string;
  fullName?: string;
  totalPoints: number;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: false,
      select: false,
    },
    fullName: {
      type: String,
      trim: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    googleId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

userSchema.index({ totalPoints: -1, _id: 1 });

export default mongoose.model<IUser>("User", userSchema);
