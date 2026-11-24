import { getPool, sql } from "@/lib/db";

// Everything the tests create carries one of these markers so cleanup can never touch real records.
export const TEST_PREFIX = "__LCS_TEST__";
export const TEST_ACCOUNT_PREFIX = "zz_lcs_test_";

const createdShelves: number[] = [];

function rand(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function validIsbn(): string {
  const body = "979" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  return body + ((10 - (sum % 10)) % 10);
}

export function testTitle(): string {
  return `${TEST_PREFIX} ${rand()}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

let dateCursor = 0;
// Far-future processing dates, spaced out so tests never share a next-day run.
export function uniqueProcessingDate(): string {
  dateCursor += 10;
  return addDays("2090-01-01", dateCursor);
}

export async function createShelf(capacity: number | null = 50): Promise<number> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("cap", sql.Int, capacity)
    .query("INSERT INTO dbo.shelf (capacity) OUTPUT INSERTED.id VALUES (@cap)");
  const id = result.recordset[0].id as number;
  createdShelves.push(id);
  return id;
}

export async function createBook(): Promise<{ id: number; isbn: string }> {
  const pool = await getPool();
  const isbn = validIsbn();
  const result = await pool
    .request()
    .input("isbn", sql.Char(13), isbn)
    .input("title", sql.NVarChar(255), testTitle())
    .query(
      "INSERT INTO dbo.book (isbn, title, genre, releaseYear) OUTPUT INSERTED.id VALUES (@isbn, @title, 'Test', 2000)",
    );
  return { id: result.recordset[0].id as number, isbn };
}

export async function addCopyRow(
  bookId: number,
  shelfId: number,
  status = "onShelf",
): Promise<number> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("b", sql.Int, bookId)
    .input("s", sql.Int, shelfId)
    .input("status", sql.NVarChar(255), status)
    .query(
      `DECLARE @c int = (SELECT ISNULL(MAX(copyNumber), 0) + 1 FROM dbo.book_copy WHERE id = @b);
       INSERT INTO dbo.book_copy (id, copyNumber, shelfID, status) VALUES (@b, @c, @s, @status);
       SELECT @c AS copyNumber;`,
    );
  return result.recordset[0].copyNumber as number;
}

export async function fillShelf(shelfId: number, bookId: number, count: number): Promise<void> {
  if (count <= 0) return;
  const pool = await getPool();
  await pool
    .request()
    .input("b", sql.Int, bookId)
    .input("s", sql.Int, shelfId)
    .input("n", sql.Int, count)
    .query(
      `DECLARE @start int = (SELECT ISNULL(MAX(copyNumber), 0) FROM dbo.book_copy WHERE id = @b);
       INSERT INTO dbo.book_copy (id, copyNumber, shelfID, status)
       SELECT TOP (@n) @b, @start + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), @s, 'onShelf'
       FROM sys.all_objects a CROSS JOIN sys.all_objects b;`,
    );
}

export async function createAccount(type: "librarian" | "patron"): Promise<string> {
  const pool = await getPool();
  const loginId = `${TEST_ACCOUNT_PREFIX}${type}_${rand()}`;
  await pool
    .request()
    .input("id", sql.VarChar(100), loginId)
    .input("type", sql.NVarChar(255), type)
    .query(
      "INSERT INTO dbo.account (loginID, name, password, address, fines, accountType) VALUES (@id, 'Test', 'test', 'test', 0, @type)",
    );
  return loginId;
}

export async function createLoan(opts: {
  bookId: number;
  copyNumber: number;
  patron: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string | null;
}): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("b", sql.Int, opts.bookId)
    .input("c", sql.Int, opts.copyNumber)
    .input("p", sql.VarChar(100), opts.patron)
    .input("l", sql.VarChar(10), opts.loanDate)
    .input("d", sql.VarChar(10), opts.dueDate)
    .input("r", sql.VarChar(10), opts.returnDate ?? null)
    .query(
      `INSERT INTO dbo.loan (bookID, copyNumber, onLoanTo, loanDate, dueDate, returnDate, fines)
       VALUES (@b, @c, @p, CONVERT(date, @l, 23), CONVERT(date, @d, 23), CONVERT(date, @r, 23), 0)`,
    );
}

export async function createHold(opts: {
  bookId: number;
  copyNumber: number;
  patron: string;
  holdDate: string;
  expirationDate: string;
}): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("b", sql.Int, opts.bookId)
    .input("c", sql.Int, opts.copyNumber)
    .input("p", sql.VarChar(100), opts.patron)
    .input("h", sql.VarChar(10), opts.holdDate)
    .input("e", sql.VarChar(10), opts.expirationDate)
    .query(
      `INSERT INTO dbo.hold (bookID, copyNumber, onHoldTo, holdDate, expirationDate)
       VALUES (@b, @c, @p, CONVERT(date, @h, 23), CONVERT(date, @e, 23))`,
    );
}

export async function setStatus(bookId: number, copyNumber: number, status: string) {
  const pool = await getPool();
  await pool
    .request()
    .input("b", sql.Int, bookId)
    .input("c", sql.Int, copyNumber)
    .input("s", sql.NVarChar(255), status)
    .query("UPDATE dbo.book_copy SET status = @s WHERE id = @b AND copyNumber = @c");
}

export async function shelfCount(shelfId: number): Promise<number> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("s", sql.Int, shelfId)
    .query("SELECT COUNT(*) AS n FROM dbo.book_copy WHERE shelfID = @s");
  return r.recordset[0].n;
}

export async function getCopy(bookId: number, copyNumber: number) {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("b", sql.Int, bookId)
    .input("c", sql.Int, copyNumber)
    .query("SELECT shelfID, status FROM dbo.book_copy WHERE id = @b AND copyNumber = @c");
  return r.recordset[0] as { shelfID: number; status: string } | undefined;
}

export async function getLoan(bookId: number, copyNumber: number) {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("b", sql.Int, bookId)
    .input("c", sql.Int, copyNumber)
    .query(
      `SELECT CONVERT(varchar(10), dueDate, 23) AS dueDate,
              CONVERT(varchar(10), returnDate, 23) AS returnDate,
              CAST(fines AS float) AS fines
       FROM dbo.loan WHERE bookID = @b AND copyNumber = @c`,
    );
  return r.recordset[0] as { dueDate: string; returnDate: string | null; fines: number } | undefined;
}

export async function hasHold(bookId: number, copyNumber: number): Promise<boolean> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("b", sql.Int, bookId)
    .input("c", sql.Int, copyNumber)
    .query("SELECT 1 AS x FROM dbo.hold WHERE bookID = @b AND copyNumber = @c");
  return r.recordset.length > 0;
}

export async function accountFines(loginId: string): Promise<number> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.VarChar(100), loginId)
    .query("SELECT fines FROM dbo.account WHERE loginID = @id");
  return r.recordset[0].fines;
}

export async function countBooksWithIsbn(isbn: string): Promise<number> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("isbn", sql.Char(13), isbn)
    .query("SELECT COUNT(*) AS n FROM dbo.book WHERE isbn = @isbn");
  return r.recordset[0].n;
}

export async function countRuns(date: string): Promise<number> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("d", sql.VarChar(10), date)
    .query("SELECT COUNT(*) AS n FROM dbo.next_day_run WHERE processingDate = CONVERT(date, @d, 23)");
  return r.recordset[0].n;
}

export async function cleanup(): Promise<void> {
  const pool = await getPool();
  const shelfList = createdShelves.length ? createdShelves.join(",") : "NULL";
  await pool
    .request()
    .input("p", sql.NVarChar(50), TEST_PREFIX)
    .input("a", sql.NVarChar(50), TEST_ACCOUNT_PREFIX)
    .query(
      `DECLARE @books TABLE (id int);
       INSERT INTO @books SELECT id FROM dbo.book WHERE LEFT(title, LEN(@p)) = @p;
       DELETE FROM dbo.hold WHERE bookID IN (SELECT id FROM @books) OR LEFT(onHoldTo, LEN(@a)) = @a;
       DELETE FROM dbo.loan WHERE bookID IN (SELECT id FROM @books) OR LEFT(onLoanTo, LEN(@a)) = @a;
       DELETE FROM dbo.book_copy WHERE id IN (SELECT id FROM @books) OR shelfID IN (${shelfList});
       DELETE FROM dbo.book_author WHERE bookID IN (SELECT id FROM @books);
       DELETE FROM dbo.book WHERE id IN (SELECT id FROM @books);
       DELETE FROM dbo.author WHERE LEFT(name, LEN(@p)) = @p;
       DELETE FROM dbo.shelf WHERE id IN (${shelfList});
       DELETE FROM dbo.next_day_run WHERE LEFT(ranBy, LEN(@a)) = @a;
       DELETE FROM dbo.account WHERE LEFT(loginID, LEN(@a)) = @a;`,
    );
  createdShelves.length = 0;
}
