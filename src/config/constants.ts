export const ReadingStatusEnum = {
  NotRead: 0,
  Reading: 1,
  Completed: 2
};

export type ReadingStatusType = (typeof ReadingStatusEnum)[keyof typeof ReadingStatusEnum];

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;
