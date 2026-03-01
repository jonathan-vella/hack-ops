"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { team: "Team Alpha", score: 8500, target: 10000 },
  { team: "Team Beta", score: 7200, target: 10000 },
  { team: "Team Gamma", score: 6800, target: 10000 },
  { team: "Team Delta", score: 5900, target: 10000 },
  { team: "Team Epsilon", score: 4500, target: 10000 },
];

export function ScoreChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.5)" />
        <XAxis dataKey="team" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0a1628",
            border: "1px solid rgba(0, 212, 255, 0.3)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#f0f4f8" }}
        />
        <Legend wrapperStyle={{ color: "#f0f4f8" }} />
        <Bar dataKey="score" fill="#00d4ff" name="Current Score" />
        <Bar
          dataKey="target"
          fill="rgba(0, 212, 255, 0.2)"
          name="Target Score"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
