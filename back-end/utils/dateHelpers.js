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

/** @param {number} n */
export const lastNDays = (n) => {
  const end = new Date();
  const start = subDays(end, n - 1);
  return eachDayOfInterval({ start, end }).map(toDateKey);
};

/** @param {string[]} sortedDateKeys */
export const calcStreak = (sortedDateKeys) => {
  if (!sortedDateKeys.length) return { current: 0, longest: 0 };

  const set = new Set(sortedDateKeys);
  const today = todayKey();
  const yesterday = toDateKey(subDays(new Date(), 1));

  let current = 0;
  let cursor = new Date();

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
