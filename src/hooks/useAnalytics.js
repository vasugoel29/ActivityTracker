import { useLiveQuery } from "dexie-react-hooks";
import {
  getDailyDistribution,
  getMissingTime,
  getWeeklyProductivity,
} from "../db/queries";

export function useDailyMetrics() {
  return useLiveQuery(async () => {
    const dist = await getDailyDistribution(new Date());
    const missingHours = await getMissingTime(new Date());
    return { ...dist, missingHours };
  });
}

export function useWeeklyProductivity() {
  return useLiveQuery(async () => {
    return await getWeeklyProductivity(new Date());
  });
}
