import React, { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { JsonViewer } from "./JsonViewer";
import { ApiHistory } from "./ApiHistory";

interface Header {
  key: string;
  value: string;
}

interface ApiResponse {
  data: any;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  method: string;
}

export function ApiTester() {
  // State
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [headers, setHeaders] = useState<Header[]>([{ key: "", value: "" }]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestName, setRequestName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"request" | "response" | "history">("request");

  // API Hooks
  const makeApiRequest = useAction(api.apiTester.makeRequest);
  const saveApiRequest = useMutation(api.apiHistory.saveApiRequest);

  // Handlers
  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleSaveRequest = async () => {
    if (!requestName.trim()) {
      toast.error("Please enter a name for your request");
      return;
    }

    if (!url.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      // Validate URL format
      new URL(url.trim());

      const validHeaders = headers
        .filter(h => h.key.trim() && h.value.trim())
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

      // Validate JSON body for POST requests
      if (method === "POST" && body.trim()) {
        try {
          JSON.parse(body);
        } catch (e) {
          toast.error("Invalid JSON in request body");
          return;
        }
      }

      await saveApiRequest({
        name: requestName.trim(),
        url: url.trim(),
        method,
        headers: validHeaders,
        body: method === "POST" ? body : undefined,
      });

      toast.success("Request saved successfully");
      setShowSaveDialog(false);
      setRequestName("");
    } catch (error) {
      console.error('Error saving request:', error);
      if (error instanceof Error) {
        if (error instanceof TypeError && error.message.includes('URL')) {
          toast.error("Please enter a valid URL");
        } else {
          toast.error(error.message || "Failed to save request");
        }
      } else {
        toast.error("Failed to save request");
      }
    }
  };

  const handleLoadHistory = (history: {
    url: string;
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
  }) => {
    setUrl(history.url);
    setMethod(history.method);
    const headersArray = Object.entries(history.headers).map(([key, value]) => ({ key, value }));
    setHeaders(headersArray.length > 0 ? headersArray : [{ key: "", value: "" }]);
    setBody(history.body || "");
    setActiveTab("request");
  };

  const formatJsonBody = () => {
    try {
      if (!body.trim()) {
        setBody("{\n  \n}");
        return;
      }
      const formatted = JSON.stringify(JSON.parse(body), null, 2);
      setBody(formatted);
      toast.success("JSON formatted successfully");
    } catch (e) {
      console.error('JSON formatting error:', e);
      toast.error("Invalid JSON format. Please check your syntax.");
      toast.error("Invalid JSON");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate request name
    if (!requestName.trim()) {
      toast.error("Please enter a request name");
      return;
    }

    // Validate URL
    if (!url.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      new URL(url.trim());
    } catch (error) {
      toast.error("Please enter a valid URL format");
      return;
    }

    // Validate JSON body for POST requests
    if (method === "POST" && body.trim()) {
      try {
        JSON.parse(body);
      } catch (error) {
        toast.error("Invalid JSON in request body");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const validHeaders = headers
        .filter(h => h.key.trim() && h.value.trim())
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

      const result = await makeApiRequest({
        url: url.trim(),
        method,
        headers: validHeaders,
        body: method === "POST" ? body : undefined,
      });

      if (result.success && result.response) {
        setResponse(result.response);
        setActiveTab("response");

        // Automatically save the request
        try {
          await saveApiRequest({
            name: requestName.trim(),
            url: url.trim(),
            method,
            headers: validHeaders,
            body: method === "POST" ? body : undefined,
          });
          toast.success("Request completed and saved successfully");
        } catch (error) {
          toast.error("Request completed but failed to save");
        }
      } else {
        setError(result.error || "Request failed");
        toast.error(result.error || "Request failed");
      }
    } catch (err) {
      console.error('API request error:', err);
      let errorMessage: string;
      
      if (err instanceof Error) {
        if (err.message.includes('CORS') || err.message.includes('network')) {
          errorMessage = "Network error: Unable to reach the API. Please check CORS settings or network connection.";
        } else if (err.message.includes('timeout')) {
          errorMessage = "Request timed out. Please try again.";
        } else {
          errorMessage = err.message;
        }
      } else {
        errorMessage = "An unexpected error occurred";
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setUrl("");
    setMethod("GET");
    setHeaders([{ key: "", value: "" }]);
    setBody("");
    setResponse(null);
    setError(null);
    setRequestName("");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              API Tester
            </h1>
            {loading && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={clearForm}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowSaveDialog(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105"
            >
              Save Request
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("request")}
            className={`px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none ${
              activeTab === "request"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Request Builder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("response")}
            className={`px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none ${
              activeTab === "response"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            } ${(!response && !error) ? "opacity-50" : ""}`}
          >
            Response Viewer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none ${
              activeTab === "history"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Request History
          </button>
        </div>

        {activeTab === "request" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Name */}
            <div>
              <label htmlFor="requestName" className="block text-sm font-medium text-gray-700 mb-2">
                Request Name *
              </label>
              <input
                id="requestName"
                type="text"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                placeholder="My API Request"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* URL and Method */}
            <div className="flex gap-4">
              <div className="flex-grow">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  API URL *
                </label>
                <div className="flex">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
                    className={`px-4 py-3 rounded-l-md border border-r-0 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                      method === "GET" ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50"
                    }`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                  <input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/data"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Headers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Headers (Optional)</label>
                <button
                  type="button"
                  onClick={addHeader}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Header
                </button>
              </div>
              <div className="space-y-2">
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) => updateHeader(index, "key", e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateHeader(index, "value", e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {headers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeHeader(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body (for POST) */}
            {method === "POST" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                    Request Body (JSON)
                  </label>
                  <button
                    type="button"
                    onClick={formatJsonBody}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
                  >
                    Format JSON
                  </button>
                </div>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='"{"key": "value"}'
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md 
                  ${loading ? "opacity-50 cursor-not-allowed" : "hover:from-blue-700 hover:to-purple-700 transform hover:scale-105"} 
                  transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {loading ? "Sending Request..." : "Send Request"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "response" && (
          <div className="space-y-4">
            {error ? (
              <div className="p-6 bg-red-50 border border-red-200 rounded-md">
                <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
                <p className="text-red-600">{error}</p>
              </div>
            ) : response ? (
              <div className="space-y-6">
                {/* Response Info */}
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`ml-2 ${response.status >= 200 && response.status < 300 ? "text-green-600" : "text-red-600"}`}>
                        {response.status} {response.statusText}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Method:</span>
                      <span className="ml-2">{response.method}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">URL:</span>
                      <span className="ml-2 break-all">{response.url}</span>
                    </div>
                  </div>
                </div>

                {/* Response Headers */}
                {Object.keys(response.headers).length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Response Headers</h3>
                    <div className="bg-gray-50 rounded-md p-3 text-sm font-mono">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <span className="text-blue-600">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response Data */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Response Data</h3>
                  <JsonViewer data={response.data} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Send a request to see the response
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Tab Content */}
      {activeTab === "history" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <ApiHistory onSelectHistory={handleLoadHistory} />
        </div>
      )}

      {/* Save Request Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Save Request</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="requestName" className="block text-sm font-medium text-gray-700 mb-1">
                  Request Name
                </label>
                <input
                  id="requestName"
                  type="text"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="My API Request"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-600">
                  <p><strong>URL:</strong> {url}</p>
                  <p><strong>Method:</strong> {method}</p>
                  {method === "POST" && body && (
                    <p><strong>Body:</strong> {body.length > 50 ? body.substring(0, 50) + "..." : body}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRequest}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
