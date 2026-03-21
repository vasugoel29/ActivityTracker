import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export function useReportsByType(type) {
    return useLiveQuery(async () => {
        const reports = await db.reports.where('type').equals(type).toArray();
        return reports.sort((a,b) => b.created_at - a.created_at);
    }, [type]);
}

export function useJobsByType(type) {
    return useLiveQuery(async () => {
        const jobs = await db.llm_jobs.where('type').equals(type).toArray();
        return jobs.sort((a,b) => b.created_at - a.created_at);
    }, [type]);
}

export async function requestReport(payloadStr, type = 'daily_report', meta = {}) {
    await db.llm_jobs.add({
        id: crypto.randomUUID(),
        type: type,
        payload: payloadStr,
        status: 'pending',
        meta: meta,
        created_at: Date.now(),
        updated_at: Date.now()
    });
}
