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
import type { AttendanceTrendPoint } from "@/lib/data/dashboards";

/** Uses distinct dash patterns in addition to color so lines remain
 * distinguishable without relying on color alone (section 8.3). */
export function AttendanceChart({ data }: { data: AttendanceTrendPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No verified attendance records in this period yet.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
          <XAxis dataKey="programme_date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="total_attendance"
            name="Total attendance"
            stroke="var(--brand)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="first_timers_count"
            name="First-timers"
            stroke="var(--success)"
            strokeDasharray="4 2"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="converts_count"
            name="Converts"
            stroke="var(--info)"
            strokeDasharray="1 3"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>Underlying attendance data for this chart</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Total attendance</th>
            <th>First-timers</th>
            <th>Converts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.programme_date + d.programme_name}>
              <td>{d.programme_date}</td>
              <td>{d.total_attendance}</td>
              <td>{d.first_timers_count}</td>
              <td>{d.converts_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
