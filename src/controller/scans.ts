import type { Request, Response } from "express";
import mongoose from "mongoose";
import WasteScan, { type WasteCategory } from "@/models/Waste.js";
import User from "@/models/Users.js";

const CATEGORIES: WasteCategory[] = [
  "RECYCLABLE",
  "BIODEGRADABLE",
  "NON_BIODEGRADABLE",
];
const POINTS_PER_CONFIRMED_SCAN = 10;

// Accepts "recyclable", "non-biodegradable", "NON_BIODEGRADABLE", etc.
// The ML model's "hazardous" (electronics) is stored as NON_BIODEGRADABLE.
const toCategory = (value: unknown): WasteCategory | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "HAZARDOUS") return "NON_BIODEGRADABLE";
  return CATEGORIES.includes(normalized as WasteCategory)
    ? (normalized as WasteCategory)
    : null;
};

export const createScan = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { material, classId, confidence, category, binColor, binLabel } =
      req.body;
    const normalizedCategory = toCategory(category);

    if (
      typeof material !== "string" ||
      !material.trim() ||
      !Number.isInteger(classId) ||
      typeof confidence !== "number" ||
      confidence < 0 ||
      confidence > 1 ||
      !normalizedCategory ||
      typeof binColor !== "string" ||
      typeof binLabel !== "string"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid scan data" });
    }

    const scan = await WasteScan.create({
      userId: new mongoose.Types.ObjectId(req.userId),
      material: material.trim(),
      classId,
      confidence,
      category: normalizedCategory,
      binColor,
      binLabel,
    });

    return res.status(201).json({ success: true, scan });
  } catch (error: unknown) {
    console.error("Create scan error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// The user confirms they put the item in the right bin -> award points once.
export const confirmScan = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!req.userId || !mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid scan id" });
    }

    // Only a PENDING scan owned by this user can flip, so points can't be awarded twice.
    const scan = await WasteScan.findOneAndUpdate(
      { _id: id, userId: req.userId, disposalStatus: "PENDING" },
      {
        disposalStatus: "CONFIRMED",
        pointsAwarded: POINTS_PER_CONFIRMED_SCAN,
        validatedAt: new Date(),
      },
      { new: true },
    );

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: "Scan not found or already confirmed",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { totalPoints: POINTS_PER_CONFIRMED_SCAN } },
      { new: true },
    ).select("totalPoints");

    return res
      .status(200)
      .json({ success: true, scan, totalPoints: user?.totalPoints ?? null });
  } catch (error: unknown) {
    console.error("Confirm scan error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const listScans = async (req: Request, res: Response) => {
  try {
    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const userId = new mongoose.Types.ObjectId(req.userId);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const scans = await WasteScan.find({ userId })   // <- was { userId: req.userId }
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, count: scans.length, scans });
  } catch (error: unknown) {
    console.error("List scans error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};