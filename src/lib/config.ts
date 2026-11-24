export const MAX_SHELF_CAPACITY = 50;

export const HOLD_PERIOD_DAYS = 3;

// The submissions don't state a fine rate; change here if the team picks another.
export const FINE_PER_OVERDUE_DAY = 1;
export const MAX_LOAN_FINE = 99.99;

export const COPY_STATUS = {
  onShelf: "onShelf",
  onLoan: "onLoan",
  onHold: "onHold",
  onLoanAndOnHold: "onLoanAndOnHold",
} as const;

export type CopyStatus = (typeof COPY_STATUS)[keyof typeof COPY_STATUS];

export function resolveCopyStatus(
  hasActiveLoan: boolean,
  hasHold: boolean,
): CopyStatus {
  if (hasActiveLoan && hasHold) return COPY_STATUS.onLoanAndOnHold;
  if (hasActiveLoan) return COPY_STATUS.onLoan;
  if (hasHold) return COPY_STATUS.onHold;
  return COPY_STATUS.onShelf;
}
