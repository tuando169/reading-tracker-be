export const ReadingStatusEnum = {
  NotRead: 0,
  Reading: 1,
  Completed: 2
};

export type ReadingStatusType = (typeof ReadingStatusEnum)[keyof typeof ReadingStatusEnum];

export const DefaultPage = 1;
export const DefaultLimit = 20;
export const MaxLimit = 50;
