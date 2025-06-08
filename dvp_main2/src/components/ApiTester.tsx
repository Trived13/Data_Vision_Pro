import React, { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { JsonViewer } from "./JsonViewer";

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
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [headers, setHeaders] = useState<Header[]>([{ key: "", value: "" }]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const makeApiRequest = useAction(api.apiTester.makeRequest);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Filter out empty headers
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
        toast.success("Request completed successfully");
      } else {
        setError(result.error || "Request failed");
        toast.error(result.error || "Request failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
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
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6">API Tester</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL and Method */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                API URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/data"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="w-32">
              <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-2">
                Method
              </label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Headers (Optional)
              </label>
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
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Request Body (for POST) */}
          {method === "POST" && (
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
                Request Body (JSON)
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending Request..." : "Send Request"}
            </button>
            <button
              type="button"
              onClick={clearForm}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Response Section */}
      {(response || error) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Response</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <h3 className="text-red-800 font-medium mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {response && (
            <div className="space-y-4">
              {/* Response Info */}
              <div className="bg-gray-50 rounded-md p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className={`ml-2 ${response.status >= 200 && response.status < 300 ? 'text-green-600' : 'text-red-600'}`}>
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
          )}
        </div>
      )}
    </div>
  );
}
