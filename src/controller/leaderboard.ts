import type { Request, Response } from "express";
import User from "@/models/Users.js";
import mongoose from "mongoose";
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const requestedLimit = req.query.limit ?? "10";
    const limitValue = Number(requestedLimit);

    if (
      typeof requestedLimit !== "string" ||
      (!["10", "20"].includes(requestedLimit) &&
        (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 20))
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be an integer between 1 and 20",
      });
    }

    const users = await User.find()
      .select("username fullName totalPoints")
      .sort({ totalPoints: -1, _id: 1 })
      .limit(limitValue)
      .lean();

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName ?? null,
      totalPoints: user.totalPoints,
    }));

    // The caller's own rank, even if they're outside the top N
    let me = null;
    if (req.userId && mongoose.isValidObjectId(req.userId)) {
      const meDoc = await User.findById(req.userId)
        .select("username fullName totalPoints")
        .lean();
      if (meDoc) {
        // same ordering as the list: points desc, then _id asc
        const ahead = await User.countDocuments({
          $or: [
            { totalPoints: { $gt: meDoc.totalPoints } },
            { totalPoints: meDoc.totalPoints, _id: { $lt: meDoc._id } },
          ],
        });
        me = {
          rank: ahead + 1,
          userId: meDoc._id.toString(),
          username: meDoc.username,
          fullName: meDoc.fullName ?? null,
          totalPoints: meDoc.totalPoints,
        };
      }
    }

    return res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard,
      me,
    });
  } catch (error: unknown) {
    console.error("Leaderboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};