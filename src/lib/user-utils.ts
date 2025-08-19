export const getInitials = (name?: string | null): string => {
  if (!name || typeof name !== "string") return "?";
  const parts = name
    .trim()
    .split(" ")
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
};