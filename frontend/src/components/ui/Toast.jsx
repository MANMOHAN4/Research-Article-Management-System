import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToastStore } from "../../store/toastStore.js";

const config = {
  success: { icon: CheckCircle, color: "text-amber-500", bar: "bg-amber-500" },
  error: { icon: AlertCircle, color: "text-red-400", bar: "bg-red-400" },
  info: { icon: Info, color: "text-blue-400", bar: "bg-blue-400" },
};

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const { icon: Icon, color, bar } = config[t.type] || config.info;
        return (
          <div
            key={t.id}
            className="pointer-events-auto relative overflow-hidden flex items-start gap-3
              px-4 py-3 rounded-lg min-w-[300px] max-w-sm
              bg-[#1A1A24] border border-white/10"
            style={{
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            {/* accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${bar}`} />

            <Icon
              size={16}
              strokeWidth={1.5}
              className={`${color} shrink-0 mt-0.5`}
            />
            <p className="text-sm text-zinc-200 flex-1 leading-snug">
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
