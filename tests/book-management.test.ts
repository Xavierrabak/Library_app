import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addBook, moveCopy, removeCopy, returnCopy } from "@/lib/inventory";
import {
  TEST_PREFIX,
  addCopyRow,
  cleanup,
  countBooksWithIsbn,
  createAccount,
  createBook,
  createHold,
  createLoan,
  createShelf,
  fillShelf,
  getCopy,
  getLoan,
  hasHold,
  shelfCount,
  testTitle,
  validIsbn,
} from "./helpers";

let librarian: string;
let patron: string;

beforeAll(async () => {
  librarian = await createAccount("librarian");
  patron = await createAccount("patron");
});

afterAll(cleanup);

async function shelfWith(copies: number, capacity = 50) {
  const shelf = await createShelf(capacity);
  const filler = await createBook();
  await fillShelf(shelf, filler.id, copies);
  return shelf;
}

describe("Book Management", () => {
  it("BM-01 adds a new book and its first copy as available", async () => {
    const shelf = await shelfWith(10);
    const isbn = validIsbn();
    const result = await addBook(librarian, {
      isbn,
      title: testTitle(),
      authors: [`${TEST_PREFIX} Author`],
      releaseYear: 2001,
      shelfId: shelf,
    });

    expect(result.createdBook).toBe(true);
    expect(result.copyNumber).toBe(1);
    expect(result.status).toBe("onShelf");
    expect(result.shelf.count).toBe(11);
    expect(await shelfCount(shelf)).toBe(11);
    expect(await getCopy(result.bookId, 1)).toMatchObject({ shelfID: shelf, status: "onShelf" });
    expect(await countBooksWithIsbn(isbn)).toBe(1);
  });

  it("BM-02 adds another copy of an existing ISBN without duplicating the book", async () => {
    const shelf = await shelfWith(10);
    const book = await createBook();
    await addCopyRow(book.id, shelf);

    const result = await addBook(librarian, { isbn: book.isbn, shelfId: shelf });

    expect(result.createdBook).toBe(false);
    expect(result.bookId).toBe(book.id);
    expect(result.copyNumber).toBe(2);
    expect(await countBooksWithIsbn(book.isbn)).toBe(1);
    expect(await shelfCount(shelf)).toBe(12);
  });

  it("BM-03 returning a loaned copy with a waiting hold sets it to onHold and keeps the hold", async () => {
    const shelf = await shelfWith(0);
    const book = await createBook();
    const copy = await addCopyRow(book.id, shelf, "onLoanAndOnHold");
    const borrower = await createAccount("patron");
    await createLoan({
      bookId: book.id,
      copyNumber: copy,
      patron: borrower,
      loanDate: "2090-01-01",
      dueDate: "2090-01-15",
    });
    await createHold({
      bookId: book.id,
      copyNumber: copy,
      patron,
      holdDate: "2090-01-05",
      expirationDate: "2090-01-08",
    });

    const result = await returnCopy(librarian, {
      bookId: book.id,
      copyNumber: copy,
      returnDate: "2090-01-10",
    });

    expect(result.status).toBe("onHold");
    expect((await getCopy(book.id, copy))?.status).toBe("onHold");
    expect(await hasHold(book.id, copy)).toBe(true);
    expect((await getLoan(book.id, copy))?.returnDate).toBe("2090-01-10");
  });

  it("BM-04 deletes an available copy and frees shelf space", async () => {
    const shelf = await shelfWith(5);
    const book = await createBook();
    const copy = await addCopyRow(book.id, shelf);

    const result = await removeCopy(librarian, { bookId: book.id, copyNumber: copy });

    expect(result.shelf.count).toBe(5);
    expect(await getCopy(book.id, copy)).toBeUndefined();
    expect(await shelfCount(shelf)).toBe(5);
  });

  it("BM-05 refuses to delete a loaned copy", async () => {
    const shelf = await shelfWith(0);
    const book = await createBook();
    const copy = await addCopyRow(book.id, shelf, "onLoan");
    await createLoan({
      bookId: book.id,
      copyNumber: copy,
      patron,
      loanDate: "2090-01-01",
      dueDate: "2090-01-15",
    });

    await expect(removeCopy(librarian, { bookId: book.id, copyNumber: copy })).rejects.toMatchObject({
      code: "COPY_ON_LOAN",
    });
    expect(await getCopy(book.id, copy)).toMatchObject({ shelfID: shelf, status: "onLoan" });
    expect(await getLoan(book.id, copy)).toBeDefined();
    expect(await shelfCount(shelf)).toBe(1);
  });

  it("BM-06 refuses to delete a copy with an active hold", async () => {
    const shelf = await shelfWith(0);
    const book = await createBook();
    const copy = await addCopyRow(book.id, shelf, "onHold");
    await createHold({
      bookId: book.id,
      copyNumber: copy,
      patron,
      holdDate: "2090-01-01",
      expirationDate: "2090-01-04",
    });

    await expect(removeCopy(librarian, { bookId: book.id, copyNumber: copy })).rejects.toMatchObject({
      code: "COPY_ON_HOLD",
    });
    expect(await hasHold(book.id, copy)).toBe(true);
    expect(await getCopy(book.id, copy)).toBeDefined();
  });

  it("BM-07 reports not-found for a missing copy and changes nothing", async () => {
    const shelf = await shelfWith(3);
    const book = await createBook();

    await expect(removeCopy(librarian, { bookId: book.id, copyNumber: 999 })).rejects.toMatchObject({
      code: "COPY_NOT_FOUND",
    });
    expect(await shelfCount(shelf)).toBe(3);
  });

  it("BM-08 rejects blank titles and invalid or missing ISBNs without saving anything", async () => {
    const shelf = await shelfWith(4);
    const base = { title: testTitle(), authors: [`${TEST_PREFIX} Author`], releaseYear: 2001, shelfId: shelf };
    const goodIsbn = validIsbn();
    const badChecksum = goodIsbn.slice(0, 12) + ((Number(goodIsbn[12]) + 1) % 10);

    for (const attempt of [
      { ...base, isbn: goodIsbn, title: "   " },
      { ...base, isbn: "12345" },
      { ...base, isbn: undefined },
      { ...base, isbn: badChecksum },
    ]) {
      await expect(addBook(librarian, attempt)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    }
    expect(await countBooksWithIsbn(goodIsbn)).toBe(0);
    expect(await countBooksWithIsbn(badChecksum)).toBe(0);
    expect(await shelfCount(shelf)).toBe(4);
  });

  it("BM-09 rejects an add to a shelf that does not exist and leaves no orphaned records", async () => {
    const isbn = validIsbn();

    await expect(
      addBook(librarian, {
        isbn,
        title: testTitle(),
        authors: [`${TEST_PREFIX} Author`],
        releaseYear: 2001,
        shelfId: 2_000_000_000,
      }),
    ).rejects.toMatchObject({ code: "SHELF_NOT_FOUND" });
    expect(await countBooksWithIsbn(isbn)).toBe(0);
  });

  it("BM-10 moves an available copy between shelves and updates both counts", async () => {
    const s1 = await shelfWith(12);
    const s2 = await shelfWith(20);
    const book = await createBook();
    const copy = await addCopyRow(book.id, s1);

    const result = await moveCopy(librarian, {
      bookId: book.id,
      copyNumber: copy,
      destinationShelfId: s2,
    });

    expect(result.moved).toBe(true);
    expect((await getCopy(book.id, copy))?.shelfID).toBe(s2);
    expect(await shelfCount(s1)).toBe(12);
    expect(await shelfCount(s2)).toBe(21);
  });

  it("BM-11 rejects a move to an unknown shelf and keeps the original placement", async () => {
    const s1 = await shelfWith(5);
    const book = await createBook();
    const copy = await addCopyRow(book.id, s1);

    await expect(
      moveCopy(librarian, { bookId: book.id, copyNumber: copy, destinationShelfId: 2_000_000_000 }),
    ).rejects.toMatchObject({ code: "SHELF_NOT_FOUND" });
    expect((await getCopy(book.id, copy))?.shelfID).toBe(s1);
    expect(await shelfCount(s1)).toBe(6);
  });

  it("BM-12 reports not-found when moving a missing copy", async () => {
    const s2 = await shelfWith(7);
    const book = await createBook();

    await expect(
      moveCopy(librarian, { bookId: book.id, copyNumber: 999, destinationShelfId: s2 }),
    ).rejects.toMatchObject({ code: "COPY_NOT_FOUND" });
    expect(await shelfCount(s2)).toBe(7);
  });

  it("BM-13 denies a patron adding a book", async () => {
    const shelf = await shelfWith(2);
    const isbn = validIsbn();

    await expect(
      addBook(patron, {
        isbn,
        title: testTitle(),
        authors: [`${TEST_PREFIX} Author`],
        releaseYear: 2001,
        shelfId: shelf,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await countBooksWithIsbn(isbn)).toBe(0);
    expect(await shelfCount(shelf)).toBe(2);
  });

  it("BM-14 denies a patron removing a book", async () => {
    const shelf = await shelfWith(0);
    const book = await createBook();
    const copy = await addCopyRow(book.id, shelf);

    await expect(removeCopy(patron, { bookId: book.id, copyNumber: copy })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(await getCopy(book.id, copy)).toBeDefined();
  });

  it("BM-15 denies a patron moving a book", async () => {
    const s1 = await shelfWith(0);
    const s2 = await shelfWith(0);
    const book = await createBook();
    const copy = await addCopyRow(book.id, s1);

    await expect(
      moveCopy(patron, { bookId: book.id, copyNumber: copy, destinationShelfId: s2 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await getCopy(book.id, copy))?.shelfID).toBe(s1);
  });

  it("rejects requests with no signed-in account", async () => {
    await expect(removeCopy(null, { bookId: 1, copyNumber: 1 })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("deleting a returned copy also clears its loan record", async () => {
    const shelf = await shelfWith(0);
    const book = await createBook();
    const copy = await addCopyRow(book.id, shelf);
    await createLoan({
      bookId: book.id,
      copyNumber: copy,
      patron,
      loanDate: "2090-01-01",
      dueDate: "2090-01-15",
      returnDate: "2090-01-05",
    });

    await removeCopy(librarian, { bookId: book.id, copyNumber: copy });

    expect(await getCopy(book.id, copy)).toBeUndefined();
    expect(await getLoan(book.id, copy)).toBeUndefined();
  });
});
