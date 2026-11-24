import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addBook, moveCopy, removeCopy } from "@/lib/inventory";
import {
  addCopyRow,
  cleanup,
  createAccount,
  createBook,
  createShelf,
  fillShelf,
  getCopy,
  shelfCount,
} from "./helpers";

let librarian: string;

beforeAll(async () => {
  librarian = await createAccount("librarian");
});

afterAll(cleanup);

async function shelfWith(copies: number) {
  const shelf = await createShelf(50);
  const filler = await createBook();
  await fillShelf(shelf, filler.id, copies);
  return { shelf, filler };
}

describe("Shelf Capacity Rules (50-book limit)", () => {
  it("SC-01 accepts an add to an empty shelf", async () => {
    const { shelf } = await shelfWith(0);
    const book = await createBook();

    const result = await addBook(librarian, { isbn: book.isbn, shelfId: shelf });

    expect(result.shelf.count).toBe(1);
    expect(await shelfCount(shelf)).toBe(1);
  });

  it("SC-02 accepts an add that reaches exactly 50", async () => {
    const { shelf, filler } = await shelfWith(49);

    await addBook(librarian, { isbn: filler.isbn, shelfId: shelf });

    expect(await shelfCount(shelf)).toBe(50);
  });

  it("SC-03 rejects an add to a full shelf", async () => {
    const { shelf, filler } = await shelfWith(50);

    await expect(addBook(librarian, { isbn: filler.isbn, shelfId: shelf })).rejects.toMatchObject({
      code: "SHELF_FULL",
    });
    expect(await shelfCount(shelf)).toBe(50);
  });

  it("SC-04 accepts a move onto a shelf at 49", async () => {
    const s1 = await shelfWith(3);
    const s2 = await shelfWith(49);
    const copy = await addCopyRow(s1.filler.id, s1.shelf);

    await moveCopy(librarian, { bookId: s1.filler.id, copyNumber: copy, destinationShelfId: s2.shelf });

    expect(await shelfCount(s2.shelf)).toBe(50);
    expect(await shelfCount(s1.shelf)).toBe(3);
  });

  it("SC-05 rejects a move onto a full shelf", async () => {
    const s1 = await shelfWith(3);
    const s2 = await shelfWith(50);
    const copy = await addCopyRow(s1.filler.id, s1.shelf);

    await expect(
      moveCopy(librarian, { bookId: s1.filler.id, copyNumber: copy, destinationShelfId: s2.shelf }),
    ).rejects.toMatchObject({ code: "SHELF_FULL" });
    expect(await shelfCount(s2.shelf)).toBe(50);
    expect((await getCopy(s1.filler.id, copy))?.shelfID).toBe(s1.shelf);
  });

  it("SC-06 allows moving out of a full shelf", async () => {
    const s1 = await shelfWith(50);
    const s2 = await shelfWith(10);

    await moveCopy(librarian, { bookId: s1.filler.id, copyNumber: 1, destinationShelfId: s2.shelf });

    expect(await shelfCount(s1.shelf)).toBe(49);
    expect(await shelfCount(s2.shelf)).toBe(11);
  });

  it("SC-07 frees capacity when a copy is removed", async () => {
    const { shelf, filler } = await shelfWith(50);

    await removeCopy(librarian, { bookId: filler.id, copyNumber: 1 });
    expect(await shelfCount(shelf)).toBe(49);

    await addBook(librarian, { isbn: filler.isbn, shelfId: shelf });
    expect(await shelfCount(shelf)).toBe(50);
  });

  it("SC-08 treats a move to the same shelf as a no-op", async () => {
    const { shelf, filler } = await shelfWith(50);

    const result = await moveCopy(librarian, {
      bookId: filler.id,
      copyNumber: 1,
      destinationShelfId: shelf,
    });

    expect(result.moved).toBe(false);
    expect(await shelfCount(shelf)).toBe(50);
  });

  it("SC-09 lets only one of two concurrent adds take the last slot", async () => {
    const { shelf, filler } = await shelfWith(49);

    const results = await Promise.allSettled([
      addBook(librarian, { isbn: filler.isbn, shelfId: shelf }),
      addBook(librarian, { isbn: filler.isbn, shelfId: shelf }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "SHELF_FULL" });
    expect(await shelfCount(shelf)).toBe(50);
  });

  it("SC-10 lets only one of two concurrent moves take the last slot", async () => {
    const from = await shelfWith(0);
    const to = await shelfWith(49);
    const a = await addCopyRow(from.filler.id, from.shelf);
    const b = await addCopyRow(from.filler.id, from.shelf);

    const results = await Promise.allSettled([
      moveCopy(librarian, { bookId: from.filler.id, copyNumber: a, destinationShelfId: to.shelf }),
      moveCopy(librarian, { bookId: from.filler.id, copyNumber: b, destinationShelfId: to.shelf }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await shelfCount(to.shelf)).toBe(50);
    expect(await shelfCount(from.shelf)).toBe(1);
  });
});
