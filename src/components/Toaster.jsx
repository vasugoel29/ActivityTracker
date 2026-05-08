import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

const ToastContext = createContext({
  success: () => {},
  error: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const addToast = useCallback((msg, type = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, msg, type }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutsRef.current.delete(id);
    }, 4000); // 4 second duration

    timeoutsRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const activeTimeouts = timeoutsRef.current;
    return () => {
      activeTimeouts.forEach((timer) => clearTimeout(timer));
      activeTimeouts.clear();
    };
  }, []);

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 items-center pointer-events-none w-full px-4">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-[#12121A] border border-gray-800 text-white shadow-[0_8px_30px_rgb(0,0,0,0.8)] rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 min-w-[280px] max-w-sm w-max pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                {t.type === "success" ? (
                  <CheckCircle2 size={18} className="text-[#818cf8] shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-red-400 shrink-0" />
                )}
                <p className="text-sm font-bold text-gray-200">{t.msg}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
