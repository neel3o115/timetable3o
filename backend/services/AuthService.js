import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import userRepository from "../repositories/UserRepository.js";
import sessionRepository from "../repositories/SessionRepository.js";
import { AppError } from "../utils/AppError.js";

class AuthService {
  constructor(users, sessions) {
    this.users = users;
    this.sessions = sessions;
  }

  getCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";

    return {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000
    };
  }

  sanitizeUser(user) {
    return {
      _id: user._id.toString(),
      email: user.email
    };
  }

  normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  validateCredentials({ email, password }) {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail) {
      throw new AppError(400, "VALIDATION_ERROR", "Email is required");
    }

    if (!password) {
      throw new AppError(400, "VALIDATION_ERROR", "Password is required");
    }

    if (password.length < 8) {
      throw new AppError(400, "VALIDATION_ERROR", "Password must be at least 8 characters");
    }

    return { email: normalizedEmail, password };
  }

  signToken(user) {
    return jwt.sign(
      {
        _id: user._id.toString(),
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
  }

  buildCookie(token) {
    return {
      name: "tt3o_token",
      value: token,
      options: this.getCookieOptions()
    };
  }

  async register({ email, password }) {
    const validated = this.validateCredentials({ email, password });
    const existingUser = await this.users.findByEmail(validated.email);

    if (existingUser) {
      throw new AppError(409, "CONFLICT", "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);
    const user = await this.users.create({
      email: validated.email,
      password: passwordHash
    });

    return this.sanitizeUser(user);
  }

  async login({ email, password }) {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail || !password) {
      throw new AppError(400, "VALIDATION_ERROR", "Email and password are required");
    }

    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    return this.sanitizeUser(user);
  }

  async authenticate({ email, password, sessionId } = {}) {
    const user = await this.login({ email, password });

    let claimed = null;
    if (sessionId) {
      const session = await this.sessions.findById(sessionId);
      if (session && !session.user_id) {
        session.user_id = user._id.toString();
        await session.save();
        claimed = session._id.toString();
      }
    }

    const token = this.signToken(user);

    return {
      user,
      claimed_session: claimed,
      cookie: this.buildCookie(token)
    };
  }

  buildAuthResponse(user) {
    const token = this.signToken(user);

    return {
      user,
      cookie: this.buildCookie(token)
    };
  }

  getCurrentUser(user) {
    if (!user?._id) {
      return { user: null };
    }

    return {
      user: {
        _id: user._id,
        email: user.email
      }
    };
  }

  getLogoutCookieOptions() {
    const { maxAge, ...options } = this.getCookieOptions();
    return options;
  }
}

export default new AuthService(userRepository, sessionRepository);
