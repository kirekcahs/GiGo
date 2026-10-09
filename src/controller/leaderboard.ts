import type { Request, Response } from "express";
import User from "@/models/Users.js";

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

    return res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error: unknown) {
    console.error("Leaderboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
