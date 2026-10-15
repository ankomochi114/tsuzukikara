export type Kind = "anime" | "manga" | "book" | "other";
export type Unit = "話" | "巻" | "章" | "ページ";
export type Status = "riding" | "later" | "done";

export type Stamp = { kind: "kugiri"; at: string; upto: number } | { kind: "done"; at: string };

export type Work = {
  id: string;
  no: number;
  title: string;
  kind: Kind;
  unit: Unit;
  progress: number;
  total: number | null;
  chunk: number;
  mins: number | null;
  reason: string;
  memo: string;
  status: Status;
  car: number | null;
  issuedAt: string;
  lastAt: string;
  doneAt?: string;
  note?: string;
  stamps: Stamp[];
  sample?: boolean;
};

export type State = {
  v: 1;
  onboarded: boolean;
  seq: number;
  works: Work[];
  updatedAt: number;
};

export type Draft = Pick<Work, "title" | "kind" | "unit" | "progress" | "total" | "chunk" | "mins" | "reason" | "memo">;

export const KINDS: Record<Kind, { label: string; icon: string; unit: Unit; chunk: number; mins: number | null }> = {
  anime: { label: "アニメ", icon: "tv", unit: "話", chunk: 4, mins: 24 },
  manga: { label: "漫画", icon: "auto_stories", unit: "巻", chunk: 3, mins: 30 },
  book: { label: "本", icon: "menu_book", unit: "章", chunk: 3, mins: 25 },
  other: { label: "その他", icon: "confirmation_number", unit: "話", chunk: 4, mins: null }
};

export const UNITS: Unit[] = ["話", "巻", "章", "ページ"];
export const UNIT_DEFAULT: Record<Unit, { chunk: number; mins: number }> = {
  話: { chunk: 4, mins: 24 },
  巻: { chunk: 3, mins: 30 },
  章: { chunk: 3, mins: 25 },
  ページ: { chunk: 50, mins: 1.5 }
};

export const CARS = [1, 2, 3] as const;

export const blankState = (): State => ({ v: 1, onboarded: false, seq: 0, works: [], updatedAt: 0 });

export function newDraft(kind: Kind = "anime"): Draft {
  const k = KINDS[kind];
  return { title: "", kind, unit: k.unit, progress: 0, total: null, chunk: k.chunk, mins: k.mins, reason: "", memo: "" };
}

export const now = () => new Date().toISOString();

export function md(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

export const daysSince = (iso?: string) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : 0);

export const ticketNo = (n: number) => "No." + String(n).padStart(4, "0");

export function fmtMin(m: number) {
  m = Math.max(5, Math.round(m / 5) * 5);
  if (m < 60) return `約${m}分`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `約${h}時間${r ? r + "分" : ""}`;
}

export function greet(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return "おはようございます";
  if (h >= 10 && h < 17) return "こんにちは";
  return "こんばんは";
}

export const posText = (w: Pick<Work, "progress" | "unit">) => (w.progress > 0 ? `${w.progress}${w.unit}まで` : "まだ乗車前");

/** 前後の区切り（駅）と、次の区切りまでの残り */
export function route(w: Pick<Work, "progress" | "chunk" | "total">) {
  const c = Math.max(1, w.chunk || 1);
  const p = w.progress || 0;
  const T = w.total || null;
  let prev = Math.floor(p / c) * c;
  let next = prev + c;
  if (T) {
    if (next > T) next = T;
    if (prev >= T) {
      prev = T;
      next = T;
    }
  }
  const remaining = Math.max(0, next - p);
  const frac = next > prev ? (p - prev) / (next - prev) : 1;
  const isEnd = !!T && next === T;
  return { prev, next, remaining, frac, isEnd };
}

export const newId = () => "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
