export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value?: string | null) {
  if (!value) return "미정";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(parseDateOnlyLocal(value));
}

export function confidenceLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function todayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function daysUntilDate(value?: string | null) {
  if (!value) return null;
  const today = startOfDay(new Date());
  const due = startOfDay(parseDateOnlyLocal(value));

  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function isDueSoon(value?: string | null) {
  const daysLeft = daysUntilDate(value);
  return daysLeft !== null && daysLeft <= 3;
}

export function getDueState(dueDate?: string | null, status?: "pending" | "in_progress" | "done") {
  if (!dueDate) {
    return {
      label: "마감 미정",
      className: "bg-slate-100/80 text-slate-600"
    };
  }

  if (status === "done") {
    return {
      label: `마감 ${formatDate(dueDate)}`,
      className: "bg-slate-100/80 text-slate-600"
    };
  }

  const daysLeft = daysUntilDate(dueDate);

  if (daysLeft === null) {
    return {
      label: "마감 미정",
      className: "bg-slate-100/80 text-slate-600"
    };
  }

  if (daysLeft < 0) {
    return {
      label: `지남 D+${Math.abs(daysLeft)}`,
      className: "bg-red-50 text-red-700"
    };
  }

  if (daysLeft === 0) {
    return {
      label: "오늘 마감",
      className: "bg-red-50 text-red-700"
    };
  }

  if (daysLeft <= 3) {
    return {
      label: `D-${daysLeft}`,
      className: "bg-amber-50 text-amber-700"
    };
  }

  return {
    label: `마감 ${formatDate(dueDate)}`,
    className: "bg-slate-100/80 text-slate-600"
  };
}

function parseDateOnlyLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(value);

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
