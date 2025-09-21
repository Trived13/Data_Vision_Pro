import jwt from "jsonwebtoken";
import { action } from "./_generated/server";
import { v } from "convex/values";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

interface JWTPayload extends jwt.JwtPayload {
  role?: string;
}

// Single action to handle both token verification and role validation
export const validateAccess = action({
  args: {
    token: v.string(),
    requiredRole: v.optional(
      v.union(
        v.literal("Admin"),
        v.literal("Analyst"),
        v.literal("Viewer")
      )
    ),
  },
  handler: async (_, { token, requiredRole }): Promise<JWTPayload> => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      // If a required role is specified, check for it
      if (requiredRole) {
        if (!decoded.role || decoded.role !== requiredRole) {
          throw new Error("Forbidden: Insufficient permissions");
        }
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'JsonWebTokenError') {
          throw new Error("Invalid token");
        } else if (error.name === 'TokenExpiredError') {
          throw new Error("Token has expired");
        }
        throw new Error(error.message);
      }
      throw new Error("Authorization failed");
    }
  },
});