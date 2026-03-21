import { db } from './db';
import { startOfDay, endOfDay, differenceInMinutes, startOfWeek, endOfWeek } from 'date-fns';

export async function getDailyDistribution(date = new Date()) {
  const start = startOfDay(date).getTime();
  const end = endOfDay(date).getTime();

  const logs = await db.logs
    .where('start_time')
    .between(start, end)
    .toArray();

  const distribution = {};
  let totalMinutes = 0;

  logs.forEach(log => {
      if (!log.end_time) return;
      const mins = differenceInMinutes(log.end_time, log.start_time);
      distribution[log.life_area || 'uncategorized'] = (distribution[log.life_area || 'uncategorized'] || 0) + mins;
      totalMinutes += mins;
  });

  const result = {};
  for (const [area, mins] of Object.entries(distribution)) {
      result[area] = +(mins / 60).toFixed(2);
  }
  return { distribution: result, totalHours: +(totalMinutes / 60).toFixed(2) };
}

export async function getMissingTime(date = new Date()) {
  const { totalHours } = await getDailyDistribution(date);
  
  const isToday = startOfDay(date).getTime() === startOfDay(new Date()).getTime();
  let hoursPassed = 24;
  if (isToday) {
      hoursPassed = (Date.now() - startOfDay(date).getTime()) / (1000 * 60 * 60);
  }
  
  const gap = Math.max(0, hoursPassed - totalHours);
  return +gap.toFixed(2);
}

export async function getWeeklyProductivity(date = new Date()) {
    const start = startOfWeek(date, { weekStartsOn: 1 }).getTime();
    const end = endOfWeek(date, { weekStartsOn: 1 }).getTime();

    const logs = await db.logs
      .where('start_time')
      .between(start, end)
      .toArray();

    let workMinutes = 0;
    logs.forEach(log => {
        if (!log.end_time || log.life_area !== 'work') return;
        workMinutes += differenceInMinutes(log.end_time, log.start_time);
    });

    return +(workMinutes / 60).toFixed(2);
}

// Quickly adds a log that finishes the previous ongoing activity if unclosed
export async function addLog(logData) {
    // find if there is an open log
    const openLogs = await db.logs.where('end_time').equals(0).toArray() || []; // Need index or filter
    const lastLogs = await db.logs.orderBy('start_time').reverse().limit(1).toArray();
    
    if (lastLogs.length > 0 && !lastLogs[0].end_time) {
        await db.logs.update(lastLogs[0].id, { end_time: Date.now(), updated_at: Date.now() });
    }
    
    return db.logs.add({
        id: crypto.randomUUID(),
        start_time: lastLogs.length > 0 ? (lastLogs[0].end_time || Date.now()) : Date.now(), // Auto start from last end
        end_time: logData.end_time || null,
        activity: logData.activity,
        life_area: logData.life_area || 'untracked',
        tags: logData.tags || [],
        energy_level: logData.energy_level || 2,
        notes: logData.notes || '',
        created_at: Date.now(),
        updated_at: Date.now()
    });
}

export async function saveHourlyLog(slotStart, slotEnd, activity, lifeArea = 'untracked') {
  const existingLogs = await db.logs.where('start_time').between(slotStart, slotEnd).toArray();
  
  if (existingLogs.length > 0) {
     if (!activity.trim()) {
       await db.logs.bulkDelete(existingLogs.map(l => l.id));
     } else {
       await db.logs.bulkDelete(existingLogs.map(l => l.id));
       await db.logs.add({
          id: crypto.randomUUID(),
          start_time: slotStart,
          end_time: slotEnd,
          activity: activity.trim(),
          life_area: lifeArea,
          energy_level: 2,
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now()
       });
     }
  } else if (activity.trim()) {
     await db.logs.add({
        id: crypto.randomUUID(),
        start_time: slotStart,
        end_time: slotEnd,
        activity: activity.trim(),
        life_area: lifeArea,
        energy_level: 2,
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now()
     });
  }
}
