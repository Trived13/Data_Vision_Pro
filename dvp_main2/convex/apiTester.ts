"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const makeRequest = action({
  args: {
    url: v.string(),
    method: v.union(v.literal("GET"), v.literal("POST")),
    headers: v.optional(v.record(v.string(), v.string())),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate URL
      let url: URL;
      try {
        url = new URL(args.url);
      } catch {
        return {
          success: false,
          error: "Invalid URL format",
        };
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: args.method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ConvexApiTester/1.0",
          ...args.headers,
        },
      };

      // Add body for POST requests
      if (args.method === "POST" && args.body) {
        try {
          // Validate JSON if content-type is application/json
          const headers = requestOptions.headers as Record<string, string>;
          const contentType = headers?.["Content-Type"] || headers?.["content-type"];
          if (contentType?.includes("application/json")) {
            JSON.parse(args.body); // Validate JSON
          }
          requestOptions.body = args.body;
        } catch {
          return {
            success: false,
            error: "Invalid JSON in request body",
          };
        }
      }

      // Make the request
      const response = await fetch(args.url, requestOptions);
      
      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Parse response data
      let responseData: any;
      const contentType = response.headers.get("content-type") || "";
      
      try {
        if (contentType.includes("application/json")) {
          responseData = await response.json();
        } else if (contentType.includes("text/")) {
          responseData = await response.text();
        } else {
          // For other content types, try to get as text
          responseData = await response.text();
        }
      } catch (parseError) {
        responseData = "Unable to parse response data";
      }

      return {
        success: true,
        response: {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          url: args.url,
          method: args.method,
        },
      };
    } catch (error) {
      console.error("API request failed:", error);
      
      let errorMessage = "Request failed";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});
