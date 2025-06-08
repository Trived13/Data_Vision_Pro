import React, { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { AuthForm } from "./components/AuthForm";
import { Dashboard } from "./components/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const user = useQuery(api.users.getCurrentUser);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">DataVision Pro</h1>
            </div>
            
            <Authenticated>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {user?.profile?.firstName || user?.email}
                </span>
                {user?.profile?.emailVerified && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                )}
                {user?.profile?.twoFactorEnabled && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    2FA Enabled
                  </span>
                )}
              </div>
            </Authenticated>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Unauthenticated>
          <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
            <AuthForm mode={authMode} onModeChange={setAuthMode} />
          </div>
        </Unauthenticated>

        <Authenticated>
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Authenticated>
      </main>

      <Toaster position="top-right" />
    </div>
  );
}
