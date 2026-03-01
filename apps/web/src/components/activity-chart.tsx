"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { timestamp: "00:00", submissions: 2, reviews: 1, corrections: 0 },
  { timestamp: "04:00", submissions: 4, reviews: 3, corrections: 1 },
  { timestamp: "08:00", submissions: 8, reviews: 5, corrections: 2 },
  { timestamp: "12:00", submissions: 12, reviews: 8, corrections: 4 },
  { timestamp: "16:00", submissions: 15, reviews: 10, corrections: 5 },
  { timestamp: "20:00", submissions: 18, reviews: 12, corrections: 6 },
  { timestamp: "23:59", submissions: 20, reviews: 14, corrections: 7 },
];

export function ActivityChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.5)" />
        <XAxis dataKey="timestamp" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0a1628",
            border: "1px solid rgba(0, 212, 255, 0.3)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#f0f4f8" }}
        />
        <Area
          type="monotone"
          dataKey="submissions"
          stroke="#00d4ff"
          fillOpacity={1}
          fill="url(#colorSubmissions)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
