import { useToastStore } from "@/store/toastStore";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const Toast = () => {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      case "error":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyle = (type) => {
    switch (type) {
      case "success":
        return {
          background: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
          color: "#065f46",
        };
      case "error":
        return {
          background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
          color: "#7f1d1d",
        };
      default:
        return {
          background: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
          color: "#1e40af",
        };
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 p-4 rounded-xl shadow-2xl animate-slide-in min-w-[320px]"
          style={getStyle(toast.type)}
        >
          {getIcon(toast.type)}
          <p className="text-sm font-semibold flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
