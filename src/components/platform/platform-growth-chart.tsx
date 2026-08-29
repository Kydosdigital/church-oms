"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { PlatformGrowthPoint } from "@/lib/data/platform";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

export function PlatformGrowthChart({ data }: { data: PlatformGrowthPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No platform growth data yet.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={shortDate}
            minTickGap={22}
          />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip labelFormatter={(value) => shortDate(String(value))} />
          <Legend />
          <Line
            type="monotone"
            dataKey="accounts"
            name="New accounts"
            stroke="var(--brand)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="churches"
            name="New churches"
            stroke="var(--success)"
            strokeDasharray="4 2"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="programmes"
            name="Programmes recorded"
            stroke="var(--info)"
            strokeDasharray="1 3"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <table className="sr-only">
        <caption>Underlying 30-day Platform Owner growth data</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>New accounts</th>
            <th>New churches</th>
            <th>Programmes recorded</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.accounts}</td>
              <td>{point.churches}</td>
              <td>{point.programmes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
