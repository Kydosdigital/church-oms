import { describe, expect, it } from "vitest";
import { parseOnlineGivingCsv } from "@/lib/online-giving-csv";

describe("parseOnlineGivingCsv", () => {
  it("parses the canonical reconciliation columns", () => {
    const result = parseOnlineGivingCsv(
      [
        "date,amount,reference,external_id",
        "2026-08-01,25.50,Sunday giving,tx-1",
        "2026-08-02,74.50,Midweek giving,tx-2",
      ].join("\n"),
      "en-GB"
    );

    expect(result.rows).toEqual([
      {
        transaction_date: "2026-08-01",
        amount: 25.5,
        reference: "Sunday giving",
        external_id: "tx-1",
      },
      {
        transaction_date: "2026-08-02",
        amount: 74.5,
        reference: "Midweek giving",
        external_id: "tx-2",
      },
    ]);
    expect(result.total).toBe(100);
  });

  it("supports quoted commas in references", () => {
    const result = parseOnlineGivingCsv(
      'date,amount,reference\n2026-08-01,12.50,"Sunday, online giving"',
      "en-GB"
    );

    expect(result.rows[0]?.reference).toBe("Sunday, online giving");
  });

  it("parses regional slash dates", () => {
    expect(
      parseOnlineGivingCsv("date,amount\n29/08/2026,10", "en-GB").rows[0]
        ?.transaction_date
    ).toBe("2026-08-29");

    expect(
      parseOnlineGivingCsv("date,amount\n08/29/2026,10", "en-US").rows[0]
        ?.transaction_date
    ).toBe("2026-08-29");
  });

  it("accepts common bank/export header aliases", () => {
    const result = parseOnlineGivingCsv(
      "transaction_date,gross,description,transaction_id\n2026-08-01,10,Gift,abc",
      "en-GB"
    );

    expect(result.rows[0]).toMatchObject({
      transaction_date: "2026-08-01",
      amount: 10,
      reference: "Gift",
      external_id: "abc",
    });
  });

  it("rejects missing required columns", () => {
    expect(() =>
      parseOnlineGivingCsv("reference,total\nGift,10", "en-GB")
    ).toThrow("date and amount");
  });

  it("rejects invalid or non-positive amounts", () => {
    expect(() =>
      parseOnlineGivingCsv("date,amount\n2026-08-01,0", "en-GB")
    ).toThrow("Invalid transaction amount");
  });

  it("rejects invalid dates", () => {
    expect(() =>
      parseOnlineGivingCsv("date,amount\n31/02/2026,10", "en-GB")
    ).toThrow("Invalid transaction date");
  });
});
