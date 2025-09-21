import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ApiHistoryProps {
  onSelectHistory: (history: {
    url: string;
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
  }) => void;
}

export function ApiHistory({ onSelectHistory }: ApiHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const history = useQuery(api.apiHistory.getUserApiHistory);
  const deleteRequest = useMutation(api.apiHistory.deleteApiRequest);
  const clearHistory = useMutation(api.apiHistory.clearAll);
  
  interface HistoryItem {
    _id: Id<"apiHistory">;
    _creationTime: number;
    name: string;
    url: string;
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
    userId: string;
  }

  const filteredHistory = history?.filter((item: HistoryItem) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (history === undefined) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Saved Requests</h2>
        <div className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleDelete = async (id: Id<"apiHistory">) => {
    try {
      await deleteRequest({ id });
      toast.success("Request deleted successfully");
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error(error instanceof Error ? error.message : "Failed to delete request");
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear the entire history?")) {
      try {
        await clearHistory();
        toast.success("History cleared successfully");
      } catch (error) {
        console.error('Error clearing history:', error);
        toast.error(error instanceof Error ? error.message : "Failed to clear history");
      }
    }
  };

  const historyItems = (filteredHistory || []) as HistoryItem[];

  if (!history && !filteredHistory) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading request history...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search requests..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {history && history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Clear History
          </button>
        )}
      </div>
      {historyItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? "No matching requests found" : "No saved requests yet"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {historyItems.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${item.method === 'GET' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {item.url}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item._creationTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => onSelectHistory(item)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}