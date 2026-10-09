import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Login now to catch up the latest update in the leaderboard.",
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    res.status(500).json({
      success: false,
      message: "Authentication service is not configured.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      res.status(401).json({
        success: false,
        message: "Invalid access token. Please log in again.",
      });
      return;
    }

    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};
