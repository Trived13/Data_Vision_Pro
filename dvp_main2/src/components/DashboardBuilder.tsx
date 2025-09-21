import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface DashboardBuilderProps {
  data: any;
  onClose: () => void;
}

interface FieldInfo {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "object";
  sampleValue: any;
}

interface ChartConfig {
  type: "bar" | "line" | "pie" | "table";
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  title: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function findArrays(obj: any, prefix = ""): { path: string, arr: any[] }[] {
  const arrays: { path: string, arr: any[] }[] = [];
  if (Array.isArray(obj)) {
    arrays.push({ path: prefix || "root", arr: obj });
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      arrays.push(...findArrays(obj[key], newPrefix));
    }
  }
  return arrays;
}

export function DashboardBuilder({ data, onClose }: DashboardBuilderProps) {
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: "bar",
    xAxis: "",
    yAxis: "",
    title: "My Chart"
  });
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [arrayPath, setArrayPath] = useState<string>("root");
  const [arrayOptions, setArrayOptions] = useState<{ path: string, arr: any[] }[]>([]);

  // Find all arrays in the data for user to select
  useEffect(() => {
    const arrays = findArrays(data);
    setArrayOptions(arrays);
    setArrayPath(arrays[0]?.path || "root");
  }, [data]);

  // When arrayPath changes, update fields and chart config
  useEffect(() => {
    const arr = arrayOptions.find(opt => opt.path === arrayPath)?.arr || [];
    const detectedFields = analyzeFields(arr);
    setFields(detectedFields);

    // Auto-suggest initial configuration
    const autoConfig = suggestChartConfig(detectedFields);
    if (autoConfig) {
      setChartConfig(autoConfig);
    }
    setProcessedData([]);
  // eslint-disable-next-line
  }, [arrayPath, arrayOptions]);

  // When chartConfig or data changes, process data for chart
  useEffect(() => {
    const arr = arrayOptions.find(opt => opt.path === arrayPath)?.arr || [];
    if (chartConfig.xAxis && chartConfig.yAxis && arr.length) {
      const processed = processDataForChart(arr, chartConfig);
      setProcessedData(processed);

      // Generate suggestions
      const newSuggestions = generateSuggestions(fields, chartConfig);
      setSuggestions(newSuggestions);
    }
  // eslint-disable-next-line
  }, [chartConfig, arrayPath, arrayOptions, fields]);

  // --- Utility functions (mostly unchanged) ---
  const analyzeFields = (data: any[]): FieldInfo[] => {
    const fields: FieldInfo[] = [];
    const sampleData = Array.isArray(data) ? data.slice(0, 5) : [data];
    const allKeys = new Set<string>();
    sampleData.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(flattenData(item)).forEach(key => allKeys.add(key));
      }
    });
    allKeys.forEach(key => {
      const sampleValues = sampleData
        .map(item => flattenData(item)[key])
        .filter(val => val !== undefined && val !== null);
      if (sampleValues.length > 0) {
        const type = detectFieldType(sampleValues);
        fields.push({
          name: key,
          type,
          sampleValue: sampleValues[0]
        });
      }
    });
    return fields.sort((a, b) => a.name.localeCompare(b.name));
  };

  const flattenData = (obj: any, prefix = ""): any => {
    const flattened: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (obj[key] === null || obj[key] === undefined) {
          flattened[newKey] = obj[key];
        } else if (Array.isArray(obj[key])) {
          flattened[newKey] = JSON.stringify(obj[key]);
        } else if (typeof obj[key] === "object") {
          Object.assign(flattened, flattenData(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    return flattened;
  };

  const detectFieldType = (values: any[]): FieldInfo["type"] => {
    const firstValue = values[0];
    if (Array.isArray(firstValue)) return "array";
    if (typeof firstValue === "boolean") return "boolean";
    if (typeof firstValue === "object") return "object";
    if (typeof firstValue === "number" || 
        (typeof firstValue === "string" && !isNaN(Number(firstValue)))) {
      return "number";
    }
    if (typeof firstValue === "string") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (dateRegex.test(firstValue) || !isNaN(Date.parse(firstValue))) {
        return "date";
      }
    }
    return "string";
  };

  const suggestChartConfig = (fields: FieldInfo[]): ChartConfig | null => {
    const stringFields = fields.filter(f => f.type === "string");
    const numberFields = fields.filter(f => f.type === "number");
    const dateFields = fields.filter(f => f.type === "date");
    if (numberFields.length === 0 && stringFields.length === 0) return null;
    let xAxis = "";
    let yAxis = numberFields.length > 0 ? numberFields[0].name : "";
    let type: ChartConfig["type"] = numberFields.length > 0 ? "bar" : "table";
    if (dateFields.length > 0) {
      xAxis = dateFields[0].name;
      if (numberFields.length > 0) type = "line";
    } else if (stringFields.length > 0) {
      xAxis = stringFields[0].name;
    } else if (numberFields.length > 1) {
      xAxis = numberFields[1].name;
    } else if (numberFields.length > 0) {
      xAxis = numberFields[0].name;
    }
    return {
      type,
      xAxis,
      yAxis,
      title: yAxis ? `${yAxis} by ${xAxis}` : `Data Analysis: ${xAxis}`
    };
  };

  const processDataForChart = (data: any[], config: ChartConfig): any[] => {
    if (!Array.isArray(data)) data = [data];
    const processed = data.map((item: any) => {
      const flattened = flattenData(item);
      const result: any = {};
      result[config.xAxis] = flattened[config.xAxis];
      let yValue = flattened[config.yAxis];
      if (typeof yValue === "string" && !isNaN(Number(yValue))) {
        yValue = Number(yValue);
      }
      result[config.yAxis] = yValue;
      if (config.groupBy) {
        result[config.groupBy] = flattened[config.groupBy];
      }
      return result;
    }).filter((item: any) => 
      item[config.xAxis] !== undefined && 
      item[config.yAxis] !== undefined &&
      typeof item[config.yAxis] === "number"
    );
    if (config.groupBy) {
      const grouped = processed.reduce((acc: any, item: any) => {
        const groupByValue = config.groupBy ? item[config.groupBy] : '';
        const key = `${item[config.xAxis]}_${groupByValue}`;
        if (!acc[key]) {
          const resultItem: any = {
            [config.xAxis]: item[config.xAxis],
            [config.yAxis]: 0,
            count: 0
          };
          if (config.groupBy) {
            resultItem[config.groupBy] = groupByValue;
          }
          acc[key] = resultItem;
        }
        acc[key][config.yAxis] += item[config.yAxis];
        acc[key].count += 1;
        return acc;
      }, {} as any);
      return Object.values(grouped);
    }
    if (config.type === "pie") {
      const aggregated = processed.reduce((acc: any, item: any) => {
        const key = item[config.xAxis];
        if (!acc[key]) {
          acc[key] = { name: key, value: 0 };
        }
        acc[key].value += item[config.yAxis];
        return acc;
      }, {} as any);
      return Object.values(aggregated);
    }
    return processed;
  };

  const generateSuggestions = (fields: FieldInfo[], config: ChartConfig): string[] => {
    const suggestions: string[] = [];
    const numberFields = fields.filter(f => f.type === "number");
    const dateFields = fields.filter(f => f.type === "date");
    const stringFields = fields.filter(f => f.type === "string");
    if (dateFields.length > 0 && config.type !== "line") {
      suggestions.push("💡 Try a line chart for time-series data");
    }
    if (stringFields.length > 0 && numberFields.length > 1 && !config.groupBy) {
      suggestions.push("💡 Consider grouping by a category field");
    }
    if (config.type === "bar" && processedData.length > 10) {
      suggestions.push("💡 Line chart might be better for large datasets");
    }
    if (stringFields.length > 0 && config.type !== "pie") {
      suggestions.push("💡 Pie chart works well for categorical data");
    }
    return suggestions;
  };

  const renderChart = () => {
    if (!processedData.length) {
      // Fallback: show a table of the raw data
      const arr = arrayOptions.find(opt => opt.path === arrayPath)?.arr || [];
      if (!arr.length) {
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available for the selected configuration
          </div>
        );
      }
      const keys = Object.keys(flattenData(arr[0] || {}));
      return (
        <div className="overflow-auto max-h-64">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {keys.map(key => (
                  <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {arr.map((row, idx) => {
                const flat = flattenData(row);
                return (
                  <tr key={idx}>
                    {keys.map(key => (
                      <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {String(flat[key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    const commonProps = {
      width: "100%",
      height: 300,
      data: processedData
    };

    switch (chartConfig.type) {
      case "bar":
        return (
          <ResponsiveContainer {...commonProps}>
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chartConfig.xAxis} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={chartConfig.yAxis}>
                  {processedData.map((entry, index) => {
                    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#0088fe", "#00c49f", "#ffbb28", "#ff8042", "#a4de6c", "#d0ed57"];
                    return (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    );
                  })}
                </Bar>
              </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={chartConfig.yAxis} 
                stroke="#8884d8" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case "table":
        return (
          <div className="overflow-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {chartConfig.xAxis}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {chartConfig.yAxis}
                  </th>
                  {chartConfig.groupBy && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {chartConfig.groupBy}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedData.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row[chartConfig.xAxis]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row[chartConfig.yAxis]}
                    </td>
                    {chartConfig.groupBy && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row[chartConfig.groupBy]}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  const getFieldsByType = (type: FieldInfo["type"]) => {
    return fields.filter(f => f.type === type);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Dashboard Builder</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Configuration Panel */}
          <div className="w-1/3 p-6 border-r overflow-y-auto">
            <div className="space-y-6">
              {/* Array Selector */}
              {arrayOptions.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Array to Visualize
                  </label>
                  <select
                    value={arrayPath}
                    onChange={e => setArrayPath(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {arrayOptions.map(opt => (
                      <option key={opt.path} value={opt.path}>
                        {opt.path} [{opt.arr.length} items]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chart Type
                </label>
                <select
                  value={chartConfig.type}
                  onChange={(e) => setChartConfig(prev => ({ 
                    ...prev, 
                    type: e.target.value as ChartConfig["type"] 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="table">Table</option>
                </select>
              </div>

              {/* Chart Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chart Title
                </label>
                <input
                  type="text"
                  value={chartConfig.title}
                  onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* X-Axis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  X-Axis Field
                </label>
                <select
                  value={chartConfig.xAxis}
                  onChange={(e) => setChartConfig(prev => ({ ...prev, xAxis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select field...</option>
                  {fields.map(field => (
                    <option key={field.name} value={field.name}>
                      {field.name} ({field.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Y-Axis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {chartConfig.type === "table" ? "Y-Axis Field" : "Y-Axis Field (Numeric)"}
                </label>
                <select
                  value={chartConfig.yAxis}
                  onChange={(e) => setChartConfig(prev => ({ ...prev, yAxis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select field...</option>
                  {chartConfig.type === "table" 
                    ? fields.map(field => (
                        <option key={field.name} value={field.name}>
                          {field.name} ({field.type})
                        </option>
                      ))
                    : getFieldsByType("number").map(field => (
                        <option key={field.name} value={field.name}>
                          {field.name}
                        </option>
                      ))
                  }
                </select>
              </div>

              {/* Group By */}
              {chartConfig.type !== "pie" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group By (Optional)
                  </label>
                  <select
                    value={chartConfig.groupBy || ""}
                    onChange={(e) => setChartConfig(prev => ({ 
                      ...prev, 
                      groupBy: e.target.value || undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {getFieldsByType("string").map(field => (
                      <option key={field.name} value={field.name}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Field Analysis */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Available Fields</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {fields.map(field => (
                    <div key={field.name} className="text-xs p-2 bg-gray-50 rounded">
                      <div className="font-medium">{field.name}</div>
                      <div className="text-gray-500">
                        Type: {field.type} | Sample: {String(field.sampleValue).slice(0, 20)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h3>
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <div key={index} className="text-xs p-2 bg-blue-50 text-blue-700 rounded">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart Display */}
          <div className="flex-1 p-6">
            <div className="h-full">
              <h3 className="text-lg font-semibold mb-4">{chartConfig.title}</h3>
              <div className="h-[calc(100%-2rem)]">
                {renderChart()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}