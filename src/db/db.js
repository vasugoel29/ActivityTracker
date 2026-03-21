import Dexie from 'dexie';

export const db = new Dexie('HabitTrackerDB');

db.version(1).stores({
  users: 'id, name, created_at',
  logs: 'id, user_id, start_time, end_time, activity, life_area, energy_level, created_at, updated_at',
  tags: 'id, name',
  log_tags: '[log_id+tag_id], log_id, tag_id',
  goals: 'id, user_id, type, metric, life_area, start_date, end_date',
  goal_progress: 'id, goal_id, date',
  reports: 'id, user_id, type, start_date, end_date, score, created_at',
  llm_jobs: 'id, type, status, created_at',
  streaks: 'id, goal_id',
  insights: 'id, user_id, type, confidence, created_at',
  nudges: 'id, user_id, trigger_type, is_read, created_at'
});

db.version(2).stores({
  habits: 'id, name, frequency_type, target_count, created_at',
  habit_logs: 'id, habit_id, [habit_id+date_string], date_string, timestamp'
});

db.version(3).stores({
  expenses: 'id, amount, category, date_string, timestamp'
});
