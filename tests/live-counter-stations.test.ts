import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0027_live_counter_station_claims.sql"
  ),
  "utf8"
);

describe("live counter station claims", () => {
  it("adds a station label and unique per-session claim", () => {
    expect(migration).toContain("station_label text");
    expect(migration).toContain("uq_attendance_counter_station_per_session");
    expect(migration).toContain("lower(btrim(station_label))");
  });

  it("requires a claimed station before counting", () => {
    expect(migration).toContain(
      "Claim a door or counting zone before counting"
    );
    expect(migration).toContain(
      "create or replace function public.claim_attendance_counter_station"
    );
  });

  it("rejects duplicate station claims", () => {
    expect(migration).toContain("when unique_violation");
    expect(migration).toContain(
      "already claimed by another Usher"
    );
  });

  it("requires a station before final submission", () => {
    expect(migration).toContain(
      "Claim a door or counting zone before submitting your count"
    );
  });

  it("audits station claims and includes station on submit/resume history", () => {
    expect(migration).toContain("'counter_station_claim'");
    expect(migration).toContain("'station_label', new.station_label");
  });
});
