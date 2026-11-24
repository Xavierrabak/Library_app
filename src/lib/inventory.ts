import "server-only";
import { getPool, sql, withTransaction } from "./db";
import {
  COPY_STATUS,
  FINE_PER_OVERDUE_DAY,
  MAX_LOAN_FINE,
  MAX_SHELF_CAPACITY,
  resolveCopyStatus,
  type CopyStatus,
} from "./config";
import { requireLibrarian } from "./auth";
import { ServiceError } from "./errors";
import {
  isValidIsbn13,
  normalizeIsbn,
  optionalText,
  parseIsoDate,
  parsePositiveInt,
  requireText,
  todayIso,
} from "./validation";

type Tx = sql.Transaction;
type Runner = Tx | sql.ConnectionPool;

export interface ShelfInfo {
  id: number;
  capacity: number;
  count: number;
}

export interface CopyRef {
  bookId: number;
  copyNumber: number;
}

function shelfLimit(capacity: number | null): number {
  return Math.min(capacity ?? MAX_SHELF_CAPACITY, MAX_SHELF_CAPACITY);
}

async function countShelf(runner: Runner, shelfId: number): Promise<number> {
  const result = await runner
    .request()
    .input("id", sql.Int, shelfId)
    .query(
      "SELECT COUNT(*) AS n FROM dbo.book_copy WITH (READCOMMITTEDLOCK) WHERE shelfID = @id",
    );
  return result.recordset[0].n;
}

// Locking the shelf row serializes every add/move/remove touching that shelf,
// so the count read afterwards cannot change before this transaction commits.
async function lockShelves(tx: Tx, shelfIds: number[]): Promise<Map<number, ShelfInfo>> {
  const found = new Map<number, ShelfInfo>();
  for (const id of [...new Set(shelfIds)].sort((a, b) => a - b)) {
    const row = await tx
      .request()
      .input("id", sql.Int, id)
      .query("SELECT capacity FROM dbo.shelf WITH (UPDLOCK, ROWLOCK) WHERE id = @id");
    if (!row.recordset.length) continue;
    found.set(id, {
      id,
      capacity: shelfLimit(row.recordset[0].capacity),
      count: await countShelf(tx, id),
    });
  }
  return found;
}

async function lockCopyAndShelves(
  tx: Tx,
  ref: CopyRef,
  extraShelfIds: number[] = [],
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const peek = await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .query("SELECT shelfID FROM dbo.book_copy WHERE id = @b AND copyNumber = @c");
    if (!peek.recordset.length) {
      throw new ServiceError("COPY_NOT_FOUND", "That book copy does not exist.");
    }
    const shelves = await lockShelves(tx, [peek.recordset[0].shelfID, ...extraShelfIds]);
    const copy = await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .query(
        "SELECT shelfID, status FROM dbo.book_copy WITH (UPDLOCK, READCOMMITTEDLOCK) WHERE id = @b AND copyNumber = @c",
      );
    if (!copy.recordset.length) {
      throw new ServiceError("COPY_NOT_FOUND", "That book copy does not exist.");
    }
    if (copy.recordset[0].shelfID === peek.recordset[0].shelfID) {
      return {
        shelfId: copy.recordset[0].shelfID as number,
        status: copy.recordset[0].status as string | null,
        shelves,
      };
    }
  }
  throw new Error("Could not lock book copy; try again.");
}

async function appLock(tx: Tx, resource: string): Promise<void> {
  const result = await tx
    .request()
    .input("res", sql.NVarChar(255), resource)
    .output("rc", sql.Int)
    .query(
      "EXEC @rc = sp_getapplock @Resource = @res, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000",
    );
  if ((result.output.rc as number) < 0) {
    throw new Error(`Could not acquire lock ${resource}`);
  }
}

function parseAuthors(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[;\n]/) : [];
  const names = list
    .map((a) => (typeof a === "string" ? a.trim() : ""))
    .filter(Boolean);
  const unique = [...new Map(names.map((n) => [n.toLowerCase(), n])).values()];
  if (!unique.length) {
    throw new ServiceError("INVALID_INPUT", "At least one author is required.");
  }
  for (const name of unique) {
    if (name.length > 200) {
      throw new ServiceError("INVALID_INPUT", "Author names must be 200 characters or fewer.");
    }
  }
  return unique;
}

export interface AddBookInput {
  isbn: unknown;
  shelfId: unknown;
  title?: unknown;
  genre?: unknown;
  series?: unknown;
  releaseYear?: unknown;
  authors?: unknown;
}

export interface AddBookResult extends CopyRef {
  shelfId: number;
  status: CopyStatus;
  createdBook: boolean;
  shelf: ShelfInfo;
}

// Adds a copy of the book with this ISBN, creating the bibliographic record first when the ISBN is new.
export async function addBook(actor: string | null, input: AddBookInput): Promise<AddBookResult> {
  await requireLibrarian(actor);

  const isbn = normalizeIsbn(input.isbn);
  if (!isbn) {
    throw new ServiceError("INVALID_INPUT", "ISBN must be a 13-digit number.");
  }
  const shelfId = parsePositiveInt(input.shelfId, "Shelf");

  return withTransaction(async (tx) => {
    await appLock(tx, `isbn:${isbn}`);

    const existing = await tx
      .request()
      .input("isbn", sql.Char(13), isbn)
      .query("SELECT TOP 1 id FROM dbo.book WHERE isbn = @isbn ORDER BY id");
    let bookId: number | null = existing.recordset[0]?.id ?? null;
    const createdBook = bookId === null;

    let details: {
      title: string;
      genre: string;
      series: string | null;
      releaseYear: number;
      authors: string[];
    } | null = null;
    if (createdBook) {
      if (!isValidIsbn13(isbn)) {
        throw new ServiceError("INVALID_INPUT", "ISBN is not a valid ISBN-13.");
      }
      const year = parsePositiveInt(input.releaseYear, "Release year");
      if (year > new Date().getFullYear()) {
        throw new ServiceError("INVALID_INPUT", "Release year cannot be in the future.");
      }
      details = {
        title: requireText(input.title, "Title", 255),
        genre: optionalText(input.genre, "Genre", 60) ?? "Uncategorized",
        series: optionalText(input.series, "Series", 150),
        releaseYear: year,
        authors: parseAuthors(input.authors),
      };
    }

    const shelves = await lockShelves(tx, [shelfId]);
    const shelf = shelves.get(shelfId);
    if (!shelf) {
      throw new ServiceError("SHELF_NOT_FOUND", `Shelf ${shelfId} does not exist.`);
    }
    if (shelf.count >= shelf.capacity) {
      throw new ServiceError(
        "SHELF_FULL",
        `Shelf ${shelfId} is full (${shelf.count}/${shelf.capacity}).`,
      );
    }

    if (details) {
      const inserted = await tx
        .request()
        .input("isbn", sql.Char(13), isbn)
        .input("title", sql.NVarChar(255), details.title)
        .input("genre", sql.VarChar(60), details.genre)
        .input("series", sql.VarChar(150), details.series)
        .input("year", sql.SmallInt, details.releaseYear)
        .query(
          "INSERT INTO dbo.book (isbn, title, genre, series, releaseYear) OUTPUT INSERTED.id VALUES (@isbn, @title, @genre, @series, @year)",
        );
      bookId = inserted.recordset[0].id as number;

      for (const name of details.authors) {
        const found = await tx
          .request()
          .input("name", sql.VarChar(sql.MAX), name)
          .query("SELECT TOP 1 id FROM dbo.author WHERE name = @name ORDER BY id");
        let authorId: number | undefined = found.recordset[0]?.id;
        if (authorId === undefined) {
          const created = await tx
            .request()
            .input("name", sql.VarChar(sql.MAX), name)
            .query("INSERT INTO dbo.author (name) OUTPUT INSERTED.id VALUES (@name)");
          authorId = created.recordset[0].id as number;
        }
        await tx
          .request()
          .input("b", sql.Int, bookId)
          .input("a", sql.Int, authorId)
          .query("INSERT INTO dbo.book_author (bookID, authorID) VALUES (@b, @a)");
      }
    }

    const next = await tx
      .request()
      .input("b", sql.Int, bookId)
      .query(
        "SELECT ISNULL(MAX(copyNumber), 0) + 1 AS n FROM dbo.book_copy WITH (UPDLOCK, HOLDLOCK) WHERE id = @b",
      );
    const copyNumber = next.recordset[0].n as number;

    await tx
      .request()
      .input("b", sql.Int, bookId)
      .input("c", sql.Int, copyNumber)
      .input("s", sql.Int, shelfId)
      .input("status", sql.NVarChar(255), COPY_STATUS.onShelf)
      .query(
        "INSERT INTO dbo.book_copy (id, copyNumber, shelfID, status) VALUES (@b, @c, @s, @status)",
      );

    return {
      bookId: bookId as number,
      copyNumber,
      shelfId,
      status: COPY_STATUS.onShelf,
      createdBook,
      shelf: { ...shelf, count: shelf.count + 1 },
    };
  });
}

export interface RemoveCopyResult {
  removed: CopyRef;
  shelf: ShelfInfo;
}

export async function removeCopy(
  actor: string | null,
  refInput: { bookId: unknown; copyNumber: unknown },
): Promise<RemoveCopyResult> {
  await requireLibrarian(actor);
  const ref = {
    bookId: parsePositiveInt(refInput.bookId, "Book ID"),
    copyNumber: parsePositiveInt(refInput.copyNumber, "Copy number"),
  };

  return withTransaction(async (tx) => {
    const { shelfId, status, shelves } = await lockCopyAndShelves(tx, ref);

    const loan = await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .query("SELECT returnDate FROM dbo.loan WHERE bookID = @b AND copyNumber = @c");
    const hold = await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .query("SELECT 1 AS x FROM dbo.hold WHERE bookID = @b AND copyNumber = @c");

    const activeLoan =
      (loan.recordset.length > 0 && loan.recordset[0].returnDate === null) ||
      status === COPY_STATUS.onLoan ||
      status === COPY_STATUS.onLoanAndOnHold;
    if (activeLoan) {
      throw new ServiceError("COPY_ON_LOAN", "This copy is checked out and cannot be removed.");
    }
    if (
      hold.recordset.length > 0 ||
      status === COPY_STATUS.onHold ||
      status === COPY_STATUS.onLoanAndOnHold
    ) {
      throw new ServiceError("COPY_ON_HOLD", "A patron is waiting on this copy; it cannot be removed.");
    }

    // A returned loan row would otherwise block the delete through its foreign key.
    await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .query("DELETE FROM dbo.loan WHERE bookID = @b AND copyNumber = @c AND returnDate IS NOT NULL");
    await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .query("DELETE FROM dbo.book_copy WHERE id = @b AND copyNumber = @c");

    const shelf = shelves.get(shelfId)!;
    return { removed: ref, shelf: { ...shelf, count: shelf.count - 1 } };
  });
}

export interface MoveCopyResult {
  moved: boolean;
  copy: CopyRef;
  fromShelf: ShelfInfo;
  toShelf: ShelfInfo;
}

export async function moveCopy(
  actor: string | null,
  input: { bookId: unknown; copyNumber: unknown; destinationShelfId: unknown },
): Promise<MoveCopyResult> {
  await requireLibrarian(actor);
  const ref = {
    bookId: parsePositiveInt(input.bookId, "Book ID"),
    copyNumber: parsePositiveInt(input.copyNumber, "Copy number"),
  };
  const destinationId = parsePositiveInt(input.destinationShelfId, "Destination shelf");

  return withTransaction(async (tx) => {
    const { shelfId, shelves } = await lockCopyAndShelves(tx, ref, [destinationId]);
    const from = shelves.get(shelfId)!;
    const to = shelves.get(destinationId);
    if (!to) {
      throw new ServiceError("SHELF_NOT_FOUND", `Shelf ${destinationId} does not exist.`);
    }
    if (shelfId === destinationId) {
      return { moved: false, copy: ref, fromShelf: from, toShelf: to };
    }
    if (to.count >= to.capacity) {
      throw new ServiceError("SHELF_FULL", `Shelf ${destinationId} is full (${to.count}/${to.capacity}).`);
    }

    await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .input("s", sql.Int, destinationId)
      .query("UPDATE dbo.book_copy SET shelfID = @s WHERE id = @b AND copyNumber = @c");

    return {
      moved: true,
      copy: ref,
      fromShelf: { ...from, count: from.count - 1 },
      toShelf: { ...to, count: to.count + 1 },
    };
  });
}

export interface ReturnCopyResult {
  copy: CopyRef;
  status: CopyStatus;
  fine: number;
}

// Records a return and sets the copy to onHold when a patron is waiting, otherwise onShelf.
export async function returnCopy(
  actor: string | null,
  input: { bookId: unknown; copyNumber: unknown; returnDate?: unknown },
): Promise<ReturnCopyResult> {
  await requireLibrarian(actor);
  const ref = {
    bookId: parsePositiveInt(input.bookId, "Book ID"),
    copyNumber: parsePositiveInt(input.copyNumber, "Copy number"),
  };
  const returnDate =
    input.returnDate === undefined ? todayIso() : parseIsoDate(input.returnDate);

  return withTransaction(async (tx) => {
    await lockCopyAndShelves(tx, ref);

    const loan = await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .input("d", sql.VarChar(10), returnDate)
      .input("rate", sql.Decimal(6, 2), FINE_PER_OVERDUE_DAY)
      .input("cap", sql.Decimal(6, 2), MAX_LOAN_FINE)
      .query(
        `SELECT l.onLoanTo, ISNULL(l.fines, 0) AS oldFine,
                CASE WHEN DATEDIFF(day, l.dueDate, CONVERT(date, @d, 23)) <= 0 THEN 0
                     WHEN DATEDIFF(day, l.dueDate, CONVERT(date, @d, 23)) * @rate > @cap THEN @cap
                     ELSE DATEDIFF(day, l.dueDate, CONVERT(date, @d, 23)) * @rate END AS newFine
         FROM dbo.loan l WITH (UPDLOCK, READCOMMITTEDLOCK)
         WHERE l.bookID = @b AND l.copyNumber = @c AND l.returnDate IS NULL`,
      );
    if (!loan.recordset.length) {
      throw new ServiceError("NOT_ON_LOAN", "This copy is not currently on loan.");
    }
    const { onLoanTo, oldFine, newFine } = loan.recordset[0] as {
      onLoanTo: string;
      oldFine: number;
      newFine: number;
    };

    await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .input("d", sql.VarChar(10), returnDate)
      .input("fine", sql.Decimal(4, 2), newFine)
      .query(
        "UPDATE dbo.loan SET returnDate = CONVERT(date, @d, 23), fines = @fine WHERE bookID = @b AND copyNumber = @c",
      );
    if (newFine !== oldFine) {
      await tx
        .request()
        .input("who", sql.VarChar(100), onLoanTo)
        .input("delta", sql.Int, Math.round(newFine - oldFine))
        .query("UPDATE dbo.account SET fines = fines + @delta WHERE loginID = @who");
    }

    const hold = await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .query("SELECT 1 AS x FROM dbo.hold WHERE bookID = @b AND copyNumber = @c");
    const status = resolveCopyStatus(false, hold.recordset.length > 0);
    await tx
      .request()
      .input("b", sql.Int, ref.bookId)
      .input("c", sql.Int, ref.copyNumber)
      .input("status", sql.NVarChar(255), status)
      .query("UPDATE dbo.book_copy SET status = @status WHERE id = @b AND copyNumber = @c");

    return { copy: ref, status, fine: newFine };
  });
}

export async function listShelves(): Promise<ShelfInfo[]> {
  const pool = await getPool();
  const result = await pool.request().query(
    `SELECT s.id, s.capacity, COUNT(bc.copyNumber) AS n
     FROM dbo.shelf s LEFT JOIN dbo.book_copy bc ON bc.shelfID = s.id
     GROUP BY s.id, s.capacity ORDER BY s.id`,
  );
  return result.recordset.map((r) => ({
    id: r.id as number,
    capacity: shelfLimit(r.capacity),
    count: r.n as number,
  }));
}

export interface CopySummary extends CopyRef {
  title: string;
  isbn: string | null;
  shelfId: number;
  status: string | null;
}

export async function searchCopies(query: string): Promise<CopySummary[]> {
  const term = query.trim();
  if (!term) return [];
  const pool = await getPool();
  const like = `%${term.replace(/[\\%_[]/g, (c) => `\\${c}`)}%`;
  const result = await pool
    .request()
    .input("like", sql.NVarChar(300), like)
    .input("term", sql.NVarChar(300), term)
    .query(
      `SELECT TOP 50 b.id AS bookId, bc.copyNumber, b.title, b.isbn, bc.shelfID AS shelfId, bc.status
       FROM dbo.book b JOIN dbo.book_copy bc ON bc.id = b.id
       WHERE b.title LIKE @like ESCAPE '\\' OR b.isbn = @term
       ORDER BY b.title, bc.copyNumber`,
    );
  return result.recordset as CopySummary[];
}
