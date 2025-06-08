import React, { useState, useRef } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";

const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Password must be at least 8 characters long");
  if (!/[A-Z]/.test(password)) errors.push("Must contain uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Must contain lowercase letter");
  if (!/\d/.test(password)) errors.push("Must contain number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("Must contain special character");
  return { isValid: errors.length === 0, errors };
};

interface AuthFormProps {
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
}

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const createProfile = useMutation(api.users.createUserProfile);
  const generateOTP = useMutation(api.otp.generateOTP);
  const verifyOTP = useMutation(api.otp.verifyOTP);
  const sendOTPEmail = useAction(api.otp.sendOTPEmail);
  const recordLoginAttempt = useMutation(api.users.recordLoginAttempt);
  const isAccountLocked = useQuery(api.users.isAccountLocked, email ? { email } : "skip");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAccountLocked) {
      toast.error("Account is temporarily locked due to too many failed login attempts");
      return;
    }

    if (mode === "register") {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        toast.error(passwordValidation.errors.join(", "));
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    if (!recaptchaToken) {
      toast.error("Please complete the reCAPTCHA verification");
      return;
    }

    setLoading(true);

    try {
  if (mode === "register" || mode === "login") {
  // Hash password on client side (in production, use a proper library)
  const hashedPassword = await hashPassword(password);

  // Use correct flow value for sign up or sign in
  const flow = mode === "register" ? "signUp" : "signIn";
  const result = await signIn("password", { email, password, flow });

  if (result) {
    // Now the user is authenticated, safe to create profile
    if (mode === "register") {
      await createProfile({
        firstName,
        lastName,
        hashedPassword,
      });

      // Generate and send email verification OTP
      const otpCode = await generateOTP({ type: "email_verification" });
      await sendOTPEmail({
        email,
        code: otpCode,
        type: "email_verification",
      });

      toast.success("Registration successful! Please check your email for verification code.");
      setShowTwoFactor(true);
    } else {
      await recordLoginAttempt({ email, success: true });
      toast.success("Login successful!");
    }
  }
}
// ...existing code...
    } catch (error) {
      await recordLoginAttempt({ email, success: false });
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
      // Reset reCAPTCHA
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken(null);
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await verifyOTP({
        code: otpCode,
        type: mode === "register" ? "email_verification" : "two_factor",
      });

      if (result.success) {
        toast.success(mode === "register" ? "Email verified successfully!" : "2FA verification successful!");
        setShowTwoFactor(false);
      } else {
        toast.error(result.error || "Invalid OTP code");
      }
    } catch (error) {
      toast.error("OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
  toast.error("Google sign-in is not available. Please use email and password.");
  // Optionally, you can hide or disable the Google button in the UI as well.
};

  // Simple password hashing (use bcrypt in production)
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  if (showTwoFactor) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-center mb-6">
            {mode === "register" ? "Verify Email" : "Two-Factor Authentication"}
          </h2>
          
          <form onSubmit={handleOTPVerification} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                Enter verification code
              </label>
              <input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="auth-input-field"
                placeholder="123456"
                maxLength={6}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="auth-button"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="auth-input-field"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="auth-input-field"
                  required
                />
              </div>
            </>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input-field"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input-field"
              required
            />
          </div>
          
          {mode === "register" && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input-field"
                required
              />
            </div>
          )}
          
          <div className="flex justify-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Test key - replace with your actual key
              onChange={(token) => setRecaptchaToken(token)}
              onExpired={() => setRecaptchaToken(null)}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || isAccountLocked || !recaptchaToken}
            className="auth-button"
          >
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
        
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </div>
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => onModeChange(mode === "login" ? "register" : "login")}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            {mode === "login" 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
