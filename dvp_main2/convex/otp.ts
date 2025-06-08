import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateOTP = mutation({
  args: {
    type: v.union(v.literal("email_verification"), v.literal("two_factor")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Invalidate any existing unused OTPs of the same type
    const existingOTPs = await ctx.db
      .query("otpCodes")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) => q.and(q.eq(q.field("type"), args.type), q.eq(q.field("used"), false)))
      .collect();

    for (const otp of existingOTPs) {
      await ctx.db.patch(otp._id, { used: true });
    }

    await ctx.db.insert("otpCodes", {
      userId,
      code,
      expiresAt,
      used: false,
      type: args.type,
    });

    return code;
  },
});

export const verifyOTP = mutation({
  args: {
    code: v.string(),
    type: v.union(v.literal("email_verification"), v.literal("two_factor")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const otpRecord = await ctx.db
      .query("otpCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("type"), args.type),
          q.eq(q.field("used"), false)
        )
      )
      .unique();

    if (!otpRecord) {
      return { success: false, error: "Invalid OTP code" };
    }

    if (otpRecord.expiresAt < Date.now()) {
      await ctx.db.patch(otpRecord._id, { used: true });
      return { success: false, error: "OTP code has expired" };
    }

    await ctx.db.patch(otpRecord._id, { used: true });

    // If email verification, mark email as verified
    if (args.type === "email_verification") {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .unique();

      if (profile) {
        await ctx.db.patch(profile._id, { emailVerified: true });
      }
    }

    return { success: true };
  },
});

export const sendOTPEmail = action({
  args: {
    email: v.string(),
    code: v.string(),
    type: v.union(v.literal("email_verification"), v.literal("two_factor")),
  },
  handler: async (ctx, args) => {
    // This would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll just log it
    console.log(`Sending OTP ${args.code} to ${args.email} for ${args.type}`);
    
    // In a real implementation, you would send the email here
    // Example with Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "noreply@yourapp.com",
      to: args.email,
      subject: args.type === "email_verification" ? "Verify your email" : "Two-factor authentication code",
      html: `Your verification code is: <strong>${args.code}</strong>`,
    });
    */
    
    return { success: true };
  },
});
