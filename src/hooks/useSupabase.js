import { useState, useEffect } from 'react';
import { supabase } from '../db/supabase';

// Global Event Bus for instantaneous optimistic refetches
const targetListeners = new Set();
export const triggerOptimisticRefetch = (tableName) => {
   targetListeners.forEach(listener => {
       if (listener.table === tableName || tableName === '*') listener.fn();
   });
};

export function useSupabase(table, queryBuilder, deps = []) {
  const [data, setData] = useState([]);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      let q = supabase.from(table).select('*');
      if (queryBuilder) {
        q = queryBuilder(q);
      }
      
      const { data: result, error } = await q;
      if (error) {
        console.error(`Supabase fetch error [table: ${table}]:`, error);
        return;
      }
      
      if (mounted && result) {
        setData(result);
      }
    };

    fetchData();

    // Subscribe to all external Postgres mutations for cross-device syncing
    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, () => {
         fetchData();
      })
      .subscribe();

    // Local instant refetch
    const listener = { table, fn: fetchData };
    targetListeners.add(listener);

    return () => {
      mounted = false;
      targetListeners.delete(listener);
      supabase.removeChannel(channel);
    };
  }, deps);

  return data;
}
