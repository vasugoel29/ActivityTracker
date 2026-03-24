import { useEffect, useRef } from 'react';
import { supabase } from '../db/supabase';

export function useActivityNotifier() {
  const lastNotified = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkEmptySlots = async () => {
      if (Notification.permission !== 'granted') return;
      
      // Throttle notifications to at most once per hour
      if (Date.now() - lastNotified.current < 3600000) return;

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // We only care about past hours (up to the previous hour)
      const maxHour = now.getHours() - 1; 
      if (maxHour < 0) return; 

      const { data: logs } = await supabase
        .from('activities')
        .select('*')
        .gte('start_time', startOfDay.getTime())
        .lt('end_time', now.getTime());

      if (!logs) return;

      let emptyCount = 0;
      for (let h = 0; h <= maxHour; h++) {
        const slotStart = new Date(startOfDay);
        slotStart.setHours(h, 0, 0, 0);
        const slotEnd = new Date(startOfDay);
        slotEnd.setHours(h + 1, 0, 0, 0);

        const hasLog = logs.some(l => l.start_time < slotEnd.getTime() && l.end_time > slotStart.getTime());
        if (!hasLog) {
          emptyCount++;
        }
      }

      if (emptyCount > 0) {
        new Notification('Activity Tracker', {
          body: `You have ${emptyCount} empty activity slot${emptyCount > 1 ? 's' : ''} today. Please fill them in!`,
          icon: '/vite.svg'
        });
        lastNotified.current = Date.now();
      }
    };

    // Delay initial check slightly to allow UI to render first
    const initialCheckTimeout = setTimeout(checkEmptySlots, 5000);
    // Poll every 15 minutes to stay fairly up to date if app remains open
    const interval = setInterval(checkEmptySlots, 15 * 60 * 1000);

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(interval);
    };
  }, []);
}
