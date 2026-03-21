import { parseBulkLogs } from './src/utils/parser.js';

const text = `Midnight - 1:30 : Doomscroll
1:30 - 7:30 : sleep
7:30 - 8:10 : getting ready (No brush, no bath)
8:10 - 10:15 : Shuttle (Music)
10:15 - 10:25 : Subway - 115
10:25 - 10:35 : Auto 55 + 5 
10:35 - 10:45 : Setup + Greetings
10:45 - 13:00: Worked on frontend
13:00 - 14:00: Lunch
14:00 - 16:30 : Room allocaiton
16:30 - 16:45 : Chai break
16:45 - 17:15 : Docuemntaion
17:15 - 19:45: Shuttle 
19:45 - 20:45: Dinner 
20:45 - 22:15 : Room allocation
22:15 - 23:00 : YouTube
23:00 - midnight: scroll and web surf`;

const lines = text.split('\n').filter(l => l.trim().length > 0);
for (const line of lines) {
    const match = line.match(/^\s*(.+?)\s*-\s*(.+?)\s*:\s*(.+)$/);
    if (!match) { console.log("NO MATCH:", line); continue; }
    let [_, startStr, endStr, activityStr] = match;
    const parseTime = (str) => {
      str = str.toLowerCase().trim();
      if (str === 'midnight') return { h: 0, m: 0 };
      const timeMatch = str.match(/(\d+):(\d+)/);
      if (timeMatch) return { h: parseInt(timeMatch[1], 10), m: parseInt(timeMatch[2], 10) };
      return null;
    };
    const startT = parseTime(startStr);
    const endT = parseTime(endStr);
    if (!startT || !endT) { console.log("INVALID TIME:", startStr, " | ", endStr, " | IN LINE:", line); continue; }
    console.log("SUCCESS:", startT, endT);
}
