import React, { useState } from "react";
import { useActivitiesForDate } from "../hooks/useActivities";
import { saveHourlyLog } from "../db/queries";
import { format, subDays, addDays, isSameDay, formatISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ActivityLog() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const logs = useActivitiesForDate(currentDate) || [];

  const handleBlur = async (h, value) => {
    const slotStart = new Date(currentDate);
    slotStart.setHours(h, 0, 0, 0);
    const slotEnd = new Date(currentDate);
    slotEnd.setHours(h + 1, 0, 0, 0);

    // Filter to the specific 1-hour block logic
    await saveHourlyLog(slotStart.getTime(), slotEnd.getTime(), value);
  };

  const isToday = isSameDay(currentDate, new Date());

  // Calculate how many hours to show (up to current hour if today, else full 24h block)
  const maxHour = isToday ? new Date().getHours() : 23;
  const hoursList = Array.from({ length: maxHour + 1 }, (_, i) => i);

  return (
    <div className="space-y-4 pt-2 px-2 pb-6">
      <header className="flex justify-between items-center bg-[#12121A] p-4 rounded-3xl border border-gray-800 shadow-sm relative mb-4 z-10">
        <button
          onClick={() => setCurrentDate(subDays(currentDate, 1))}
          className="p-2 text-gray-400 hover:text-white transition"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">
            {isToday ? "Today" : format(currentDate, "MMM d, yyyy")}
          </h2>
          <p className="text-xs text-gray-500 font-medium tracking-widest uppercase">
            {format(currentDate, "EEEE")}
          </p>
        </div>
        <button
          onClick={() => setCurrentDate(addDays(currentDate, 1))}
          disabled={isToday}
          className={`p-2 transition ${isToday ? "text-gray-800 cursor-not-allowed" : "text-gray-400 hover:text-white"}`}
        >
          <ChevronRight size={24} />
        </button>
      </header>

      <div className="bg-[#0B0B0F] border border-gray-800 rounded-3xl overflow-hidden shadow-inner">
        {hoursList.map((h) => {
          const slotStart = new Date(currentDate);
          slotStart.setHours(h, 0, 0, 0);
          const slotEnd = new Date(currentDate);
          slotEnd.setHours(h + 1, 0, 0, 0);

          const logsInHour = logs.filter(
            (l) =>
              l.start_time < slotEnd.getTime() &&
              l.end_time > slotStart.getTime(),
          );
          const sortedLogs = logsInHour.sort(
            (a, b) => a.start_time - b.start_time,
          );
          const combinedActivity = sortedLogs
            .map((l) => l.activity)
            .join(" | ");

          const displayHour = `${h.toString().padStart(2, "0")}:00`;

          return (
            <div
              key={`${formatISO(currentDate)}-${h}`}
              className="flex items-center border-b border-gray-800/50 last:border-0 group transition-colors focus-within:bg-[#12121A]/50"
            >
              <div className="w-20 py-5 px-3 text-right shrink-0">
                <span className="text-sm font-mono font-bold text-gray-600 group-focus-within:text-[#818cf8] transition-colors">
                  {displayHour}
                </span>
              </div>
              <input
                key={combinedActivity + h}
                type="text"
                defaultValue={combinedActivity}
                onBlur={(e) => {
                  if (e.target.value !== combinedActivity) {
                    handleBlur(h, e.target.value);
                  }
                }}
                placeholder="—"
                className="flex-1 bg-transparent px-2 py-5 text-white text-base focus:outline-none placeholder-gray-700 w-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
