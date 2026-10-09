import User from "@/models/Users.js";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import type { Request, Response } from "express";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const secret = process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not configured");
    }

    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

    const accessToken = jwt.sign(
      {
        sub: user._id.toString(),
      },
      secret,
      {
        expiresIn: "15m",
      },
    );

    // 5. Return the token and safe user information
    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        totalPoints: user.totalPoints,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, fullName } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (
      fullName !== undefined &&
      (typeof fullName !== "string" || !fullName.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name must be a non-empty string",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          existingUser.email === normalizedEmail
            ? "Email is already registered"
            : "Username is already taken",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      ...(fullName !== undefined && {
        fullName: fullName.trim(),
      }),
    });

    const secret = process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not configured");
    }

    const accessToken = jwt.sign({ sub: user._id.toString() }, secret, {
      expiresIn: "15m",
    });

    // 6. Return safe user information
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      accessToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    // Handle duplicate-key errors, including concurrent registrations
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal qwew error",
    });
  }
};

const googleClient = new OAuth2Client();

export const googleLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { idToken } = req.body;

    // 1. Validate the request
    if (typeof idToken !== "string" || !idToken.trim()) {
      res.status(400).json({
        success: false,
        message: "Google ID token is required.",
      });
      return;
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

    if (!googleClientId || !accessTokenSecret) {
      console.error("Missing Google OAuth or JWT environment configuration.");

      res.status(500).json({
        success: false,
        message: "Authentication service is not configured.",
      });
      return;
    }

    // 2. Verify the ID token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      res.status(401).json({
        success: false,
        message: "Google account could not be verified.",
      });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();

    // 3. Find an existing Google account
    let user = await User.findOne({ googleId });

    // 4. Create an account if one doesn't exist
    if (!user) {
      // Never silently link accounts using email alone.
      const existingEmail = await User.findOne({ email });

      if (existingEmail) {
        res.status(409).json({
          success: false,
          message:
            "An account with this email already exists. Sign in using your existing method or implement secure account linking.",
        });
        return;
      }

      const baseUsername =
        (email.split("@")[0] ?? "user")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 20) || "user";

      const username = `${baseUsername}_${googleId.slice(-6)}`;

      user = await User.create({
        googleId,
        username,
        email,
        ...(payload.name !== undefined && {
          fullName: payload.name,
        }),
        totalPoints: 0,
      });
    }

    // 5. Generate your application's JWT
    const accessToken = jwt.sign(
      { sub: user._id.toString() },
      accessTokenSecret,
      { expiresIn: "15m" },
    );

    // 6. Return the token and public user information
    res.status(200).json({
      success: true,
      message: "Google sign-in successful.",
      accessToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        totalPoints: user.totalPoints,
      },
    });
  } catch (error: unknown) {
    console.error("Google authentication error:", error);

    res.status(401).json({
      success: false,
      message: "Google authentication failed.",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
