import React, { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { ApiTester } from "./ApiTester";

export function Dashboard() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser);
  const sessions = useQuery(api.sessions.getUserSessions);
  const updateProfile = useMutation(api.users.updateProfile);
  const revokeSession = useMutation(api.sessions.revokeSession);
  const generateOTP = useMutation(api.otp.generateOTP);
  const verifyOTP = useMutation(api.otp.verifyOTP);
  const sendOTPEmail = useAction(api.otp.sendOTPEmail);

  const [activeTab, setActiveTab] = useState<"profile" | "api-tester">("profile");
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.profile?.firstName || "");
  const [lastName, setLastName] = useState(user?.profile?.lastName || "");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.profile?.twoFactorEnabled || false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateProfile({
        firstName,
        lastName,
        twoFactorEnabled,
      });
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleToggle2FA = async () => {
    if (!twoFactorEnabled) {
      // Enabling 2FA - require OTP verification
      try {
        const code = await generateOTP({ type: "two_factor" });
        await sendOTPEmail({
          email: user?.email || "",
          code,
          type: "two_factor",
        });
        setShowOTPInput(true);
        toast.info("Please enter the verification code sent to your email");
      } catch (error) {
        toast.error("Failed to send verification code");
      }
    } else {
      // Disabling 2FA
      setTwoFactorEnabled(false);
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await verifyOTP({
        code: otpCode,
        type: "two_factor",
      });

      if (result.success) {
        setTwoFactorEnabled(true);
        setShowOTPInput(false);
        setOtpCode("");
        toast.success("Two-factor authentication enabled!");
      } else {
        toast.error(result.error || "Invalid verification code");
      }
    } catch (error) {
      toast.error("Verification failed");
    }
  };

  const handleRevokeSession = async (token: string) => {
    try {
      await revokeSession({ token });
      toast.success("Session revoked successfully");
    } catch (error) {
      toast.error("Failed to revoke session");
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with Navigation */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Profile & Security
            </button>
            <button
              onClick={() => setActiveTab("api-tester")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "api-tester"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              API Tester
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Section */}
              <div className="border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                
                {editing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {user.profile?.firstName} {user.profile?.lastName}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Email Verified:</strong> {user.profile?.emailVerified ? "Yes" : "No"}</p>
                    <p><strong>Last Login:</strong> {user.profile?.lastLogin ? new Date(user.profile.lastLogin).toLocaleString() : "Never"}</p>
                    
                    <button
                      onClick={() => setEditing(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>

              {/* Security Section */}
              <div className="border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600">
                        {twoFactorEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <button
                      onClick={handleToggle2FA}
                      className={`px-4 py-2 rounded-md ${
                        twoFactorEnabled 
                          ? "bg-red-600 hover:bg-red-700 text-white" 
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {twoFactorEnabled ? "Disable" : "Enable"}
                    </button>
                  </div>

                  {showOTPInput && (
                    <form onSubmit={handleOTPVerification} className="space-y-2">
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Enter verification code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={6}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Verify
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Active Sessions</h2>
            
            {sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {session.deviceInfo || "Unknown Device"}
                      </p>
                      <p className="text-sm text-gray-600">
                        IP: {session.ipAddress || "Unknown"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires: {new Date(session.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(session.token)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No active sessions found.</p>
            )}
          </div>
        </>
      )}

      {activeTab === "api-tester" && <ApiTester />}
    </div>
  );
}
