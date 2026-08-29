"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/calculations";
import type { AttendanceGivingPoint } from "@/lib/data/reports";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value + "T12:00:00"));
}

export function AttendanceGivingChart({
  data,
  currencyCode,
}: {
  data: AttendanceGivingPoint[];
  currencyCode: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted">
        No services have both verified attendance and verified finance in this period yet.
      </p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
          <XAxis
            dataKey="programme_date"
            tick={{ fontSize: 11 }}
            tickFormatter={shortDate}
            minTickGap={20}
          />
          <YAxis
            yAxisId="attendance"
            tick={{ fontSize: 12 }}
            allowDecimals={false}
            label={{
              value: "Attendance",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11 },
            }}
          />
          <YAxis
            yAxisId="giving"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              new Intl.NumberFormat("en-GB", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(Number(value))
            }
          />
          <Tooltip
            labelFormatter={(value) => shortDate(String(value))}
            formatter={(value, name) => {
              const numeric = Number(value);
              if (name === "Giving") return [formatCurrency(numeric, currencyCode), name];
              return [numeric.toLocaleString("en-GB"), name];
            }}
          />
          <Legend />
          <Bar
            yAxisId="attendance"
            dataKey="total_attendance"
            name="Attendance"
            fill="var(--brand)"
            opacity={0.7}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="giving"
            type="monotone"
            dataKey="total_giving"
            name="Giving"
            stroke="var(--success)"
            strokeWidth={3}
            strokeDasharray="5 2"
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <table className="sr-only">
        <caption>Underlying attendance and giving comparison data</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Programme</th>
            <th>Attendance</th>
            <th>Total giving</th>
            <th>Giving per attendee</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.programme_id}>
              <td>{point.programme_date}</td>
              <td>{point.programme_name}</td>
              <td>{point.total_attendance}</td>
              <td>{formatCurrency(point.total_giving, currencyCode)}</td>
              <td>
                {point.giving_per_attendee === null
                  ? "N/A"
                  : formatCurrency(point.giving_per_attendee, currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
