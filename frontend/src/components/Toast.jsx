import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast toast--${type}`} onClick={onClose}>
      <span className="toast__icon">
        {type === "success" ? "\u2713" : type === "error" ? "\u2717" : "\u26A0"}
      </span>
      <span>{message}</span>
    </div>
  );
}
