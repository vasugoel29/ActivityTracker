import { useEffect } from "react";
import { supabase } from "../db/supabase";

/**
 * Hook to listen for new transactions in the expenses table and send native browser notifications.
 */
export function useTransactionNotifier() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Request desktop notification permissions on mount
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Subscribe to new rows inserted into the expenses table.
    // Row Level Security (RLS) ensures the user only receives insert events for their own data.
    const channel = supabase
      .channel("realtime:expenses-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "expenses" },
        (payload) => {
          const expense = payload.new;
          if (!expense) return;

          if (Notification.permission === "granted") {
            const isAuto = expense.description?.startsWith("Auto-fetched from SMS");
            const title = isAuto ? "⚡ Transaction Auto-Logged" : "💸 Expense Recorded";
            const cleanDescription = expense.description || "No notes";

            new Notification(title, {
              body: `${expense.category}: ₹${expense.amount.toFixed(2)} (${cleanDescription})`,
              icon: "/vite.svg", // Application icon
              badge: "/vite.svg"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
