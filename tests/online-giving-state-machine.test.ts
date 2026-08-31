import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0045_online_giving_state_machine.sql"
  ),
  "utf8"
);

describe("online giving reconciliation state machine", () => {
  it("only matches unmatched transactions", () => {
    expect(migration).toContain("v_tx.status <> 'unmatched'");
    expect(migration).toContain(
      "Only unmatched transactions can be matched"
    );
  });

  it("only ignores unmatched transactions", () => {
    expect(migration).toContain(
      "Only unmatched transactions can be ignored"
    );
  });

  it("only restores matched or ignored transactions", () => {
    expect(migration).toContain(
      "v_tx.status not in ('matched', 'ignored')"
    );
    expect(migration).toContain(
      "This transaction is already unmatched"
    );
  });

  it("enforces the 500-character note bound in the table and RPCs", () => {
    expect(migration).toContain("online_giving_match_note_length");
    expect(migration).toContain("char_length(match_note) <= 500");
    expect(migration).toContain(
      "Match notes may contain at most 500 characters"
    );
    expect(migration).toContain(
      "Ignore reasons may contain at most 500 characters"
    );
  });

  it("preserves ignored reasons in the restore audit trail", () => {
    expect(migration).toContain(
      "case when v_tx.status = 'ignored' then v_tx.match_note else null end"
    );
  });
});
