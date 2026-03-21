export function parseBulkLogs(text, baseDate = new Date()) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const logs = [];
  
  let currentBase = new Date(baseDate);
  currentBase.setHours(0,0,0,0);
  
  let lastStartMs = 0;

  for (const line of lines) {
    // Matches explicit time formats to prevent confusing colons in the activity description with separators
    const match = line.match(/^\s*(midnight|noon|\d{1,2}:\d{2})\s*-\s*(midnight|noon|\d{1,2}:\d{2})\s*[:\-\s]?\s*(.+)$/i);
    if (!match) continue;

    let [_, startStr, endStr, activityStr] = match;

    const parseTime = (str) => {
      str = str.toLowerCase().trim();
      if (str === 'midnight') return { h: 0, m: 0 };
      if (str === 'noon') return { h: 12, m: 0 };
      
      const timeMatch = str.match(/(\d+):(\d+)/);
      if (timeMatch) {
        return { h: parseInt(timeMatch[1], 10), m: parseInt(timeMatch[2], 10) };
      }
      return null;
    };

    const startT = parseTime(startStr);
    const endT = parseTime(endStr);

    if (!startT || !endT) continue;

    let start = new Date(currentBase);
    start.setHours(startT.h, startT.m, 0, 0);

    // If chronologically this start time is BEFORE the previous start time, 
    // it usually means we crossed into the next day (e.g. 23:00 then 00:00 next line).
    if (lastStartMs > 0 && start.getTime() < lastStartMs) {
       currentBase.setDate(currentBase.getDate() + 1);
       start = new Date(currentBase);
       start.setHours(startT.h, startT.m, 0, 0);
    }

    let end = new Date(currentBase);
    end.setHours(endT.h, endT.m, 0, 0);

    // If the block itself crosses midnight (e.g. 23:00 - 01:00)
    if (end.getTime() < start.getTime()) {
       end.setDate(end.getDate() + 1);
    }

    lastStartMs = start.getTime();

    logs.push({
      start_time: start.getTime(),
      end_time: end.getTime(),
      activity: activityStr.trim()
    });
  }

  return logs;
}
