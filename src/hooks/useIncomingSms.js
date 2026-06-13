import { useState, useEffect } from "react";
import { supabase } from "../db/supabase";
import { useSupabase, triggerOptimisticRefetch } from "./useSupabase";

/**
 * Hook to retrieve and subscribe to unprocessed incoming SMS alerts.
 */
export function useUnprocessedSms() {
  return useSupabase(
    "incoming_sms",
    (q) => q.eq("processed", false).order("created_at", { ascending: true }),
    []
  );
}

/**
 * Marks a specific SMS alert as processed.
 */
export async function markSmsProcessed(id) {
  const { error } = await supabase
    .from("incoming_sms")
    .update({ processed: true })
    .eq("id", id);
  
  if (error) {
    console.error("Error marking SMS as processed:", error);
    throw error;
  }
  
  triggerOptimisticRefetch("incoming_sms");
}

/**
 * Hook to fetch or automatically initialize a user's API settings (e.g. API key).
 */
export function useUserSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchOrInitSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          if (mounted) setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user settings:", error);
          if (mounted) setLoading(false);
          return;
        }

        if (data) {
          if (mounted) {
            setSettings(data);
            setLoading(false);
          }
        } else {
          // Fallback: If DB trigger hasn't fired or for existing users, generate it client-side
          const randomBytes = new Uint8Array(24);
          window.crypto.getRandomValues(randomBytes);
          const hexKey = Array.from(randomBytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          const newSettings = {
            user_id: user.id,
            api_key: hexKey,
            created_at: Date.now()
          };

          const { data: insertedData, error: insertError } = await supabase
             .from("user_settings")
             .insert([newSettings])
             .select()
             .maybeSingle();

          if (insertError) {
             console.error("Error initializing user settings:", insertError);
          } else if (mounted && insertedData) {
             setSettings(insertedData);
          }
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error("Failed in fetchOrInitSettings:", err);
        if (mounted) setLoading(false);
      }
    };

    fetchOrInitSettings();

    // Subscribe to settings changes for real-time updates
    const channel = supabase
      .channel("public:user_settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_settings" },
        () => {
          fetchOrInitSettings();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}
