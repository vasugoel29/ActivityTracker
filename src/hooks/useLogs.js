import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { startOfDay, endOfDay } from 'date-fns';

export function useTodayLogs() {
  return useLiveQuery(() => {
    const start = startOfDay(new Date()).getTime();
    const end = endOfDay(new Date()).getTime();
    return db.logs
      .where('start_time')
      .between(start, end)
      .toArray();
  });
}

export function useOngoingActivity() {
  return useLiveQuery(async () => {
    const lastLogs = await db.logs.orderBy('start_time').reverse().limit(1).toArray();
    if (lastLogs.length > 0 && !lastLogs[0].end_time) {
      return lastLogs[0];
    }
    return null;
  });
}

export function useLogsForDate(date) {
  return useLiveQuery(() => {
    const start = startOfDay(date).getTime();
    const end = endOfDay(date).getTime();
    return db.logs
      .where('start_time')
      .between(start, end)
      .toArray();
  }, [date.getTime()]);
}
