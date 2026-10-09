import mongoose, { Schema, Document, Types } from "mongoose";

export type WasteCategory =
  | "RECYCLABLE"
  | "BIODEGRADABLE"
  | "NON_BIODEGRADABLE";

export type DisposalStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export interface IWasteScan extends Document {
  userId: Types.ObjectId;
  material: string;
  classId: number;
  confidence: number;
  category: WasteCategory;
  binColor: string;
  binLabel: string;
  disposalStatus: DisposalStatus;
  pointsAwarded: number;
  validatedAt?: Date;
  createdAt: Date;
}

const wasteScanSchema = new Schema<IWasteScan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    material: {
      type: String,
      required: true,
      trim: true,
    },
    classId: {
      type: Number,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    category: {
      type: String,
      enum: ["RECYCLABLE", "BIODEGRADABLE", "NON_BIODEGRADABLE"],
      required: true,
    },
    binColor: {
      type: String,
      required: true,
    },
    binLabel: {
      type: String,
      required: true,
    },
    disposalStatus: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "REJECTED"],
      default: "PENDING",
    },
    pointsAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    validatedAt: Date,
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

wasteScanSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IWasteScan>("WasteScan", wasteScanSchema);
