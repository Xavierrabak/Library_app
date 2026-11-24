import "server-only";
import { getPool, sql, withTransaction } from "./db";
import {
  FINE_PER_OVERDUE_DAY,
  HOLD_PERIOD_DAYS,
  MAX_LOAN_FINE,
} from "./config";
import { requireLibrarian } from "./auth";
import { parseIsoDate, todayIso } from "./validation";

export type NextDayStep = "overdue-loans" | "expired-holds";

export interface NextDayOptions {
  // Limits processing to these books; used by tests so they never touch real records.
  restrictToBookIds?: number[];
  // Called after each step inside the transaction; throwing here simulates a write failure.
  afterStep?: (step: NextDayStep) => void;
}

export interface OverdueLoan {
  bookId: number;
  copyNumber: number;
  onLoanTo: string;
  daysOverdue: number;
  fine: number;
  previousFine: number;
}

export interface ExpiredHold {
  bookId: number;
  copyNumber: number;
  onHoldTo: string;
  copyStatus: string | null;
}

export interface NextDayResult {
  processingDate: string;
  alreadyProcessed: boolean;
  overdueLoans: OverdueLoan[];
  expiredHolds: ExpiredHold[];
}

const DUPLICATE_KEY = [2627, 2601];
const DATE_SQL = "CONVERT(date, @date, 23)";

class AlreadyProcessed extends Error {}

function scopeClause(column: string, ids?: number[]): string {
  if (!ids) return "";
  const safe = ids.filter((id) => Number.isInteger(id));
  return safe.length ? `AND ${column} IN (${safe.join(",")})` : "AND 1 = 0";
}

// Applies the once-per-day updates (overdue fines, expired holds) for one processing date.
// Each date can be processed only once; repeat calls return the stored result.
export async function runNextDay(
  actor: string | null,
  processingDate?: string,
  options: NextDayOptions = {},
): Promise<NextDayResult> {
  const librarian = await requireLibrarian(actor);
  const date = processingDate === undefined ? todayIso() : parseIsoDate(processingDate);

  try {
    return await withTransaction(async (tx) => {
      try {
        await tx
          .request()
          .input("date", sql.VarChar(10), date)
          .input("by", sql.VarChar(100), librarian)
          .query(
            `INSERT INTO dbo.next_day_run (processingDate, ranBy) VALUES (${DATE_SQL}, @by)`,
          );
      } catch (err) {
        if (DUPLICATE_KEY.includes((err as { number?: number }).number ?? 0)) {
          throw new AlreadyProcessed();
        }
        throw err;
      }

      const overdue = await tx
        .request()
        .input("date", sql.VarChar(10), date)
        .input("rate", sql.Decimal(6, 2), FINE_PER_OVERDUE_DAY)
        .input("cap", sql.Decimal(6, 2), MAX_LOAN_FINE)
        .query(
          `SELECT l.bookID, l.copyNumber, l.onLoanTo,
                  CAST(ISNULL(l.fines, 0) AS decimal(6, 2)) AS oldFine,
                  DATEDIFF(day, l.dueDate, ${DATE_SQL}) AS daysOverdue,
                  CASE WHEN DATEDIFF(day, l.dueDate, ${DATE_SQL}) * @rate > @cap THEN @cap
                       ELSE DATEDIFF(day, l.dueDate, ${DATE_SQL}) * @rate END AS newFine
           INTO #overdue
           FROM dbo.loan l WITH (UPDLOCK, READCOMMITTEDLOCK)
           WHERE l.returnDate IS NULL AND l.dueDate < ${DATE_SQL}
             ${scopeClause("l.bookID", options.restrictToBookIds)};

           UPDATE a SET a.fines = a.fines + d.delta
           FROM dbo.account a
           JOIN (SELECT onLoanTo, CAST(ROUND(SUM(newFine - oldFine), 0) AS int) AS delta
                 FROM #overdue WHERE newFine <> oldFine GROUP BY onLoanTo) d
             ON d.onLoanTo = a.loginID;

           UPDATE l SET l.fines = o.newFine
           FROM dbo.loan l
           JOIN #overdue o ON o.bookID = l.bookID AND o.copyNumber = l.copyNumber
           WHERE o.newFine <> o.oldFine;

           SELECT bookID, copyNumber, onLoanTo, oldFine, newFine, daysOverdue
           FROM #overdue ORDER BY bookID, copyNumber;

           DROP TABLE #overdue;`,
        );
      const overdueLoans: OverdueLoan[] = overdue.recordset.map((r) => ({
        bookId: r.bookID,
        copyNumber: r.copyNumber,
        onLoanTo: r.onLoanTo,
        daysOverdue: r.daysOverdue,
        fine: Number(r.newFine),
        previousFine: Number(r.oldFine),
      }));
      options.afterStep?.("overdue-loans");

      const holds = await tx
        .request()
        .input("date", sql.VarChar(10), date)
        .input("holdDays", sql.Int, HOLD_PERIOD_DAYS)
        .query(
          `SELECT h.bookID, h.copyNumber, h.onHoldTo
           INTO #expired
           FROM dbo.hold h WITH (UPDLOCK, READCOMMITTEDLOCK)
           WHERE COALESCE(h.expirationDate, DATEADD(day, @holdDays, h.holdDate)) <= ${DATE_SQL}
             ${scopeClause("h.bookID", options.restrictToBookIds)};

           DELETE h FROM dbo.hold h
           JOIN #expired e ON e.bookID = h.bookID AND e.copyNumber = h.copyNumber;

           UPDATE bc SET bc.status = CASE
             WHEN EXISTS (SELECT 1 FROM dbo.loan l
                          WHERE l.bookID = bc.id AND l.copyNumber = bc.copyNumber AND l.returnDate IS NULL)
               THEN 'onLoan'
             WHEN EXISTS (SELECT 1 FROM dbo.hold h2
                          WHERE h2.bookID = bc.id AND h2.copyNumber = bc.copyNumber)
               THEN 'onHold'
             ELSE 'onShelf' END
           FROM dbo.book_copy bc
           JOIN #expired e ON e.bookID = bc.id AND e.copyNumber = bc.copyNumber;

           SELECT e.bookID, e.copyNumber, e.onHoldTo, bc.status
           FROM #expired e
           LEFT JOIN dbo.book_copy bc ON bc.id = e.bookID AND bc.copyNumber = e.copyNumber
           ORDER BY e.bookID, e.copyNumber;

           DROP TABLE #expired;`,
        );
      const expiredHolds: ExpiredHold[] = holds.recordset.map((r) => ({
        bookId: r.bookID,
        copyNumber: r.copyNumber,
        onHoldTo: r.onHoldTo,
        copyStatus: r.status,
      }));
      options.afterStep?.("expired-holds");

      const result: NextDayResult = {
        processingDate: date,
        alreadyProcessed: false,
        overdueLoans,
        expiredHolds,
      };
      await tx
        .request()
        .input("date", sql.VarChar(10), date)
        .input("summary", sql.NVarChar(sql.MAX), JSON.stringify(result))
        .query(
          `UPDATE dbo.next_day_run SET summary = @summary WHERE processingDate = ${DATE_SQL}`,
        );
      return result;
    });
  } catch (err) {
    if (!(err instanceof AlreadyProcessed)) throw err;
    const pool = await getPool();
    const stored = await pool
      .request()
      .input("date", sql.VarChar(10), date)
      .query(`SELECT summary FROM dbo.next_day_run WHERE processingDate = ${DATE_SQL}`);
    const summary = stored.recordset[0]?.summary;
    const previous: Partial<NextDayResult> = summary ? JSON.parse(summary) : {};
    return {
      processingDate: date,
      overdueLoans: previous.overdueLoans ?? [],
      expiredHolds: previous.expiredHolds ?? [],
      alreadyProcessed: true,
    };
  }
}
