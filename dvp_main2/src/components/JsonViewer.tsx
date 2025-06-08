import React, { useState } from "react";
import { DashboardBuilder } from "./DashboardBuilder";

interface JsonViewerProps {
  data: any;
}

interface FlattenedData {
  [key: string]: any;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const [view, setView] = useState<"formatted" | "flattened" | "raw">("formatted");
  const [showDashboard, setShowDashboard] = useState(false);

  const flattenObject = (obj: any, prefix = ""): FlattenedData => {
    const flattened: FlattenedData = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}_${key}` : key;
        
        if (obj[key] === null || obj[key] === undefined) {
          flattened[newKey] = obj[key];
        } else if (Array.isArray(obj[key])) {
          flattened[newKey] = obj[key];
          // Also flatten array items if they're objects
          obj[key].forEach((item: any, index: number) => {
            if (typeof item === "object" && item !== null) {
              const arrayFlattened = flattenObject(item, `${newKey}_${index}`);
              Object.assign(flattened, arrayFlattened);
            }
          });
        } else if (typeof obj[key] === "object") {
          const nested = flattenObject(obj[key], newKey);
          Object.assign(flattened, nested);
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  };

  const detectStructure = (obj: any): string[] => {
    const fields: string[] = [];
    
    const traverse = (current: any, path = "") => {
      if (typeof current === "object" && current !== null && !Array.isArray(current)) {
        Object.keys(current).forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          fields.push(newPath);
          traverse(current[key], newPath);
        });
      } else if (Array.isArray(current) && current.length > 0) {
        if (typeof current[0] === "object") {
          traverse(current[0], `${path}[0]`);
        }
      }
    };
    
    traverse(obj);
    return [...new Set(fields)].sort();
  };

  const renderValue = (value: any): React.ReactNode => {
    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    if (typeof value === "string") return <span className="text-green-600">"{value}"</span>;
    if (typeof value === "number") return <span className="text-blue-600">{value}</span>;
    if (typeof value === "boolean") return <span className="text-purple-600">{value.toString()}</span>;
    if (Array.isArray(value)) return <span className="text-orange-600">[Array({value.length})]</span>;
    if (typeof value === "object") return <span className="text-gray-600">[Object]</span>;
    return String(value);
  };

  const renderFormattedJson = (obj: any, indent = 0): React.ReactNode => {
    const indentStyle = { paddingLeft: `${indent * 20}px` };
    
    if (Array.isArray(obj)) {
      return (
        <div>
          <div style={indentStyle} className="text-gray-600">[</div>
          {obj.map((item, index) => (
            <div key={index}>
              <div style={{ paddingLeft: `${(indent + 1) * 20}px` }}>
                {renderFormattedJson(item, indent + 1)}
                {index < obj.length - 1 && <span className="text-gray-600">,</span>}
              </div>
            </div>
          ))}
          <div style={indentStyle} className="text-gray-600">]</div>
        </div>
      );
    }
    
    if (typeof obj === "object" && obj !== null) {
      const keys = Object.keys(obj);
      return (
        <div>
          <div style={indentStyle} className="text-gray-600">{"{"}</div>
          {keys.map((key, index) => (
            <div key={key}>
              <div style={{ paddingLeft: `${(indent + 1) * 20}px` }}>
                <span className="text-red-600">"{key}"</span>
                <span className="text-gray-600">: </span>
                {renderFormattedJson(obj[key], indent + 1)}
                {index < keys.length - 1 && <span className="text-gray-600">,</span>}
              </div>
            </div>
          ))}
          <div style={indentStyle} className="text-gray-600">{"}"}</div>
        </div>
      );
    }
    
    return renderValue(obj);
  };

  const canCreateDashboard = () => {
    if (!data) return false;
    
    // Check if data has fields suitable for visualization
    const flattened = flattenObject(data);
    const values = Object.values(flattened);
    
    // Check for numeric fields
    const hasNumericFields = values.some(value => 
      typeof value === "number" || 
      (typeof value === "string" && !isNaN(Number(value)) && value.trim() !== "")
    );
    
    // Check for categorical fields (strings, booleans)
    const hasCategoricalFields = values.some(value => 
      typeof value === "string" || typeof value === "boolean"
    );
    
    // Check if we have enough data for visualization
    const hasMultipleDataPoints = Array.isArray(data) ? data.length > 1 : Object.keys(flattened).length > 1;
    
    return hasMultipleDataPoints && (hasNumericFields || hasCategoricalFields);
  };

  if (!data) {
    return (
      <div className="bg-gray-50 rounded-md p-4 text-gray-500">
        No data to display
      </div>
    );
  }

  const flattened = flattenObject(data);
  const structure = detectStructure(data);

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setView("formatted")}
          className={`px-3 py-1 text-sm rounded-md ${
            view === "formatted" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Formatted
        </button>
        <button
          onClick={() => setView("flattened")}
          className={`px-3 py-1 text-sm rounded-md ${
            view === "flattened" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Flattened
        </button>
        <button
          onClick={() => setView("raw")}
          className={`px-3 py-1 text-sm rounded-md ${
            view === "raw" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Raw JSON
        </button>
        
        {canCreateDashboard() && (
          <button
            onClick={() => setShowDashboard(true)}
            className="ml-4 px-4 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            📊 Create Dashboard
          </button>
        )}
      </div>

      {/* Data Structure Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <h4 className="font-medium text-blue-800 mb-2">Detected Structure</h4>
        <div className="text-sm text-blue-700">
          <p>Total fields: {structure.length}</p>
          <p>Data type: {Array.isArray(data) ? "Array" : typeof data}</p>
          {Array.isArray(data) && <p>Array length: {data.length}</p>}
          {canCreateDashboard() && (
            <p className="text-green-700 font-medium">✓ Dashboard-ready data detected</p>
          )}
        </div>
      </div>

      {/* Content Display */}
      <div className="bg-gray-50 rounded-md p-4 overflow-auto max-h-96">
        {view === "formatted" && (
          <div className="font-mono text-sm">
            {renderFormattedJson(data)}
          </div>
        )}

        {view === "flattened" && (
          <div className="space-y-1">
            {Object.entries(flattened).map(([key, value]) => (
              <div key={key} className="flex">
                <span className="font-mono text-sm text-blue-600 min-w-0 flex-1 mr-4">
                  {key}:
                </span>
                <span className="font-mono text-sm">
                  {renderValue(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {view === "raw" && (
          <pre className="font-mono text-sm whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>

      {/* Field List */}
      {structure.length > 0 && (
        <div className="bg-gray-50 rounded-md p-4">
          <h4 className="font-medium text-gray-700 mb-2">Available Fields</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 text-sm">
            {structure.map(field => (
              <div key={field} className="font-mono text-gray-600">
                {field}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Builder Modal */}
      {showDashboard && (
        <DashboardBuilder 
          data={data} 
          onClose={() => setShowDashboard(false)} 
        />
      )}
    </div>
  );
}
