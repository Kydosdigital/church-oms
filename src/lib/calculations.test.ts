import { describe, it, expect } from "vitest";
import {
  totalAttendance,
  capacityUtilization,
  exceedsCapacity,
  outcomesExceedAttendance,
  attendanceGrowthRate,
  categoryTotal,
  projectProgressPercent,
  formatPercent,
} from "./calculations";

describe("totalAttendance", () => {
  it("sums men, women, teenagers and children (ATT-02)", () => {
    expect(
      totalAttendance({ men_count: 10, women_count: 15, teenagers_count: 5, children_count: 3 })
    ).toBe(33);
  });
});

describe("exceedsCapacity", () => {
  it("is false when capacity is not set (0)", () => {
    expect(exceedsCapacity(100, 0)).toBe(false);
  });
  it("is true when total exceeds capacity", () => {
    expect(exceedsCapacity(150, 100)).toBe(true);
  });
  it("is false at exactly capacity", () => {
    expect(exceedsCapacity(100, 100)).toBe(false);
  });
});

describe("capacityUtilization", () => {
  it("returns null when capacity is 0 or missing", () => {
    expect(capacityUtilization(50, 0)).toBeNull();
  });
  it("computes percentage of capacity used", () => {
    expect(capacityUtilization(50, 200)).toBe(25);
  });
});

describe("outcomesExceedAttendance", () => {
  it("flags first-timers exceeding total", () => {
    expect(
      outcomesExceedAttendance(
        {
          men_count: 0,
          women_count: 0,
          teenagers_count: 0,
          children_count: 0,
          first_timers_count: 10,
          converts_count: 0,
          new_births_count: 0,
          weddings_count: 0,
        },
        5
      )
    ).toBe(true);
  });
  it("is false when outcomes are within total", () => {
    expect(
      outcomesExceedAttendance(
        {
          men_count: 0,
          women_count: 0,
          teenagers_count: 0,
          children_count: 0,
          first_timers_count: 2,
          converts_count: 1,
          new_births_count: 0,
          weddings_count: 0,
        },
        50
      )
    ).toBe(false);
  });
});

describe("attendanceGrowthRate", () => {
  it("returns null when there's no previous baseline", () => {
    expect(attendanceGrowthRate(100, 0)).toBeNull();
  });
  it("computes percentage growth", () => {
    expect(attendanceGrowthRate(120, 100)).toBe(20);
  });
  it("computes percentage decline", () => {
    expect(attendanceGrowthRate(80, 100)).toBe(-20);
  });
});

describe("categoryTotal", () => {
  it("adds physical + online using integer cents to avoid float drift", () => {
    expect(categoryTotal(10.1, 20.2)).toBeCloseTo(30.3, 5);
  });
  it("avoids the classic 0.1 + 0.2 float error", () => {
    expect(categoryTotal(0.1, 0.2)).toBe(0.3);
  });
});

describe("projectProgressPercent", () => {
  it("returns null with no target configured", () => {
    expect(projectProgressPercent(500, null)).toBeNull();
  });
  it("returns null with a zero or negative target", () => {
    expect(projectProgressPercent(500, 0)).toBeNull();
  });
  it("computes percent of target raised", () => {
    expect(projectProgressPercent(250, 1000)).toBe(25);
  });
});

describe("formatPercent", () => {
  it("renders N/A for null", () => {
    expect(formatPercent(null)).toBe("N/A");
  });
  it("formats with one decimal by default", () => {
    expect(formatPercent(33.333)).toBe("33.3%");
  });
});
