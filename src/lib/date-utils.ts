export const getDaysInMonth = (year: number, month: number): number => 
  new Date(year, month + 1, 0).getDate();

export const getMonthName = (monthIndex: number, locale = "es-ES"): string => {
  const d = new Date();
  d.setMonth(monthIndex);
  return d.toLocaleString(locale, { month: "long" });
};

export const formatDate = (date: Date, format = "YYYY-MM-DD"): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (format === "YYYY-MM-DD") return `${y}-${m}-${d}`;
  return date.toLocaleDateString("es-ES");
};

export const getDayOfWeekMondayFirst = (date: Date): number => {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
};