import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";

/** @param {Date} date */
export const toDateKey = (date) => format(date, "yyyy-MM-dd");

export const todayKey = () => toDateKey(new Date());

/** Local midnight of a YYYY-MM-DD key. @param {string} key */
export const keyToDate = (key) => new Date(`${key}T00:00:00`);

/** @param {Date} [end] */
export const last90Days = (end = new Date()) => {
  const start = subDays(end, 89);
  return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const currentWeekKeys = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map(toDateKey);
};

/** @param {number} n @param {string} [endKey] defaults to today */
export const lastNDays = (n, endKey) => {
  const end = endKey ? keyToDate(endKey) : new Date();
  const start = subDays(end, n - 1);
  return eachDayOfInterval({ start, end }).map(toDateKey);
};

/**
 * @param {string[]} sortedDateKeys
 * @param {string} [today] the user's current day (YYYY-MM-DD); defaults to the server's
 */
export const calcStreak = (sortedDateKeys, today = todayKey()) => {
  if (!sortedDateKeys.length) return { current: 0, longest: 0 };

  const set = new Set(sortedDateKeys);
  const yesterday = toDateKey(subDays(keyToDate(today), 1));

  let current = 0;
  let cursor = keyToDate(today);

  if (!set.has(today) && !set.has(yesterday)) {
    current = 0;
  } else {
    if (!set.has(today)) cursor = subDays(cursor, 1);
    while (set.has(toDateKey(cursor))) {
      current += 1;
      cursor = subDays(cursor, 1);
    }
  }

  const sortedAsc = [...sortedDateKeys].sort();
  let longest = 0;
  let run = 0;
  let prev = null;

  for (const k of sortedAsc) {
    if (prev) {
      const d = new Date(`${k}T00:00:00.000Z`);
      const p = new Date(`${prev}T00:00:00.000Z`);
      const diff = Math.round((d.getTime() - p.getTime()) / (1000 * 60 * 60 * 24));
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = k;
  }

  return { current, longest };
};
