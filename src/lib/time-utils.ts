export const formatTime = (totalSeconds: number): string => {
  if (totalSeconds < 0 || !totalSeconds) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const formatHours = (totalSeconds: number): string => {
  if (totalSeconds < 0 || !totalSeconds) return "0.0";
  const h = totalSeconds / 3600;
  return h.toFixed(1);
};