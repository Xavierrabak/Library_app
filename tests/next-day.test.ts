import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runNextDay } from "@/lib/nextDay";
import {
  accountFines,
  addCopyRow,
  addDays,
  cleanup,
  countRuns,
  createAccount,
  createBook,
  createHold,
  createLoan,
  createShelf,
  getCopy,
  getLoan,
  hasHold,
  uniqueProcessingDate,
} from "./helpers";

let librarian: string;
let patron: string;
let shelf: number;
let bookId: number;

beforeAll(async () => {
  librarian = await createAccount("librarian");
  shelf = await createShelf(50);
});

// A fresh book per test keeps loans and holds from earlier tests out of later runs.
beforeEach(async () => {
  bookId = (await createBook()).id;
});

afterAll(cleanup);

const run = (actor: string, date: string, extra = {}) =>
  runNextDay(actor, date, { restrictToBookIds: [bookId], ...extra });

async function loanedCopy(opts: { due: string; returned?: string | null; status?: string }) {
  const copy = await addCopyRow(bookId, shelf, opts.status ?? "onLoan");
  await createLoan({
    bookId,
    copyNumber: copy,
    patron,
    loanDate: addDays(opts.due, -14),
    dueDate: opts.due,
    returnDate: opts.returned ?? null,
  });
  return copy;
}

async function heldCopy(opts: { expires: string; holdDate: string; status?: string }) {
  const copy = await addCopyRow(bookId, shelf, opts.status ?? "onHold");
  await createHold({
    bookId,
    copyNumber: copy,
    patron,
    holdDate: opts.holdDate,
    expirationDate: opts.expires,
  });
  return copy;
}

// Each test gets its own patron so fine totals can be asserted exactly.
async function freshPatron() {
  patron = await createAccount("patron");
}

describe("Next-Day Function", () => {
  it("ND-01 lets a librarian process overdue loans and expired holds", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const loan = await loanedCopy({ due: addDays(day, -1) });
    const held = await heldCopy({ holdDate: addDays(day, -3), expires: day });

    const result = await run(librarian, day);

    expect(result.alreadyProcessed).toBe(false);
    expect(result.overdueLoans).toHaveLength(1);
    expect(result.expiredHolds).toHaveLength(1);
    expect((await getLoan(bookId, loan))?.fines).toBe(1);
    expect(await accountFines(patron)).toBe(1);
    expect(await hasHold(bookId, held)).toBe(false);
    expect(await countRuns(day)).toBe(1);
  });

  it("ND-02 denies a patron and changes nothing", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const loan = await loanedCopy({ due: addDays(day, -2) });

    await expect(run(patron, day)).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect((await getLoan(bookId, loan))?.fines).toBe(0);
    expect(await accountFines(patron)).toBe(0);
    expect(await countRuns(day)).toBe(0);
  });

  it("ND-03 does not repeat side effects when run twice for the same date", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    await loanedCopy({ due: addDays(day, -3) });
    const held = await heldCopy({ holdDate: addDays(day, -3), expires: day });

    const first = await run(librarian, day);
    const second = await run(librarian, day);

    expect(first.alreadyProcessed).toBe(false);
    expect(second.alreadyProcessed).toBe(true);
    expect(second.overdueLoans).toEqual(first.overdueLoans);
    expect(await accountFines(patron)).toBe(3);
    expect(await hasHold(bookId, held)).toBe(false);
    expect(await countRuns(day)).toBe(1);
  });

  it("ND-04 leaves a loan due tomorrow alone", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const due = addDays(day, 1);
    const loan = await loanedCopy({ due });

    const result = await run(librarian, day);

    expect(result.overdueLoans).toHaveLength(0);
    expect(await getLoan(bookId, loan)).toMatchObject({ dueDate: due, fines: 0 });
  });

  it("ND-05 does not mark a loan overdue on its due date", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const loan = await loanedCopy({ due: day });

    const result = await run(librarian, day);

    expect(result.overdueLoans).toHaveLength(0);
    expect((await getLoan(bookId, loan))?.fines).toBe(0);
  });

  it("ND-06 marks a loan overdue the day after it was due and applies the fine", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const loan = await loanedCopy({ due: addDays(day, -1) });

    const result = await run(librarian, day);

    expect(result.overdueLoans).toMatchObject([{ copyNumber: loan, daysOverdue: 1, fine: 1 }]);
    expect(await accountFines(patron)).toBe(1);
  });

  it("ND-07 ignores a loan that was already returned", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const loan = await loanedCopy({ due: addDays(day, -5), returned: addDays(day, -6) });

    const result = await run(librarian, day);

    expect(result.overdueLoans).toHaveLength(0);
    expect((await getLoan(bookId, loan))?.fines).toBe(0);
    expect(await accountFines(patron)).toBe(0);
  });

  it("ND-08 expires a hold and makes the copy available", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const held = await heldCopy({ holdDate: addDays(day, -4), expires: addDays(day, -1) });

    await run(librarian, day);

    expect(await hasHold(bookId, held)).toBe(false);
    expect((await getCopy(bookId, held))?.status).toBe("onShelf");
  });

  it("ND-09 keeps a hold that has not expired", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const held = await heldCopy({ holdDate: addDays(day, -2), expires: addDays(day, 1) });

    const result = await run(librarian, day);

    expect(result.expiredHolds).toHaveLength(0);
    expect(await hasHold(bookId, held)).toBe(true);
    expect((await getCopy(bookId, held))?.status).toBe("onHold");
  });

  it("ND-10 expires a hold on a loaned copy without marking it available", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const copy = await loanedCopy({ due: addDays(day, 5), status: "onLoanAndOnHold" });
    await createHold({
      bookId,
      copyNumber: copy,
      patron,
      holdDate: addDays(day, -4),
      expirationDate: addDays(day, -1),
    });

    await run(librarian, day);

    expect(await hasHold(bookId, copy)).toBe(false);
    expect((await getCopy(bookId, copy))?.status).toBe("onLoan");
  });

  it("ND-11 changes nothing when nothing is due", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const loan = await loanedCopy({ due: addDays(day, 5) });
    const held = await heldCopy({ holdDate: addDays(day, -1), expires: addDays(day, 2) });

    const result = await run(librarian, day);

    expect(result.overdueLoans).toHaveLength(0);
    expect(result.expiredHolds).toHaveLength(0);
    expect(await getLoan(bookId, loan)).toMatchObject({ fines: 0, returnDate: null });
    expect((await getCopy(bookId, loan))?.status).toBe("onLoan");
    expect(await hasHold(bookId, held)).toBe(true);
    expect(await accountFines(patron)).toBe(0);
  });

  it("ND-12 rolls everything back on a mid-run failure and can be retried", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    const loan = await loanedCopy({ due: addDays(day, -2) });
    const held = await heldCopy({ holdDate: addDays(day, -4), expires: addDays(day, -1) });

    await expect(
      run(librarian, day, {
        afterStep: (step: string) => {
          if (step === "expired-holds") throw new Error("simulated write failure");
        },
      }),
    ).rejects.toThrow("simulated write failure");

    expect((await getLoan(bookId, loan))?.fines).toBe(0);
    expect(await accountFines(patron)).toBe(0);
    expect(await hasHold(bookId, held)).toBe(true);
    expect(await countRuns(day)).toBe(0);

    const retry = await run(librarian, day);

    expect(retry.alreadyProcessed).toBe(false);
    expect(await accountFines(patron)).toBe(2);
    expect(await hasHold(bookId, held)).toBe(false);
  });

  it("ND-13 processes a new day once without repeating the previous day's actions", async () => {
    await freshPatron();
    const day = uniqueProcessingDate();
    await loanedCopy({ due: addDays(day, -1) });
    const held = await heldCopy({ holdDate: addDays(day, -4), expires: day });

    await run(librarian, day);
    expect(await accountFines(patron)).toBe(1);

    const next = await run(librarian, addDays(day, 1));

    expect(next.alreadyProcessed).toBe(false);
    expect(next.overdueLoans).toMatchObject([{ daysOverdue: 2, fine: 2, previousFine: 1 }]);
    expect(next.expiredHolds).toHaveLength(0);
    expect(await accountFines(patron)).toBe(2);
    expect(await hasHold(bookId, held)).toBe(false);
  });
});
