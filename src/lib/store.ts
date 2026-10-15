import { useCallback, useEffect, useMemo, useState } from "react";
import { blankState, CARS, type Draft, newId, now, type State, type Status, type Work } from "./model";

const KEY = "tsuzukikara.v1";

export function normalize(raw: unknown): State {
  const b = blankState();
  if (!raw || typeof raw !== "object") return b;
  const s = raw as Partial<State>;
  return { ...b, ...s, v: 1, works: Array.isArray(s.works) ? s.works : [] };
}

function loadLocal(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* 読めないときは空から始める */
  }
  return blankState();
}

const SAMPLES: (Draft & { status: Status; ago: number })[] = [
  { title: "星降る街の喫茶店", kind: "anime", unit: "話", progress: 8, total: 12, chunk: 4, mins: 24, memo: "店長の過去がわかりかけたところ", reason: "", status: "riding", ago: 2 },
  { title: "灯台守の手紙", kind: "book", unit: "ページ", progress: 132, total: 320, chunk: 50, mins: 1.5, memo: "妹からの手紙が偽物かも？と気づいたところ。次は島に渡る話", reason: "", status: "later", ago: 21 },
  { title: "鉄と花の王国", kind: "manga", unit: "巻", progress: 5, total: null, chunk: 5, mins: 30, memo: "第2部に入るところ", reason: "", status: "later", ago: 40 },
  { title: "月面ベーカリー", kind: "anime", unit: "話", progress: 0, total: 13, chunk: 4, mins: 24, memo: "", reason: "友達が泣けると言っていた", status: "later", ago: 9 }
];

export type RecordResult = { kind: "none"; diff: number } | { kind: "kugiri"; upto: number } | { kind: "done" };

export function useStore() {
  const [state, setState] = useState<State>(loadLocal);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* 保存できない環境では何もしない */
    }
  }, [state]);

  const mutate = useCallback((fn: (s: State) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      next.updatedAt = Date.now();
      return next;
    });
  }, []);

  const riding = useMemo(() => state.works.filter((w) => w.status === "riding").sort((a, b) => (a.car ?? 0) - (b.car ?? 0)), [state]);
  const later = useMemo(
    () => state.works.filter((w) => w.status === "later").sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt)),
    [state]
  );
  const done = useMemo(
    () => state.works.filter((w) => w.status === "done").sort((a, b) => +new Date(b.doneAt ?? 0) - +new Date(a.doneAt ?? 0)),
    [state]
  );
  const freeCar: number | undefined = CARS.find((c) => !riding.some((w) => w.car === c));
  const byId = (id: string) => state.works.find((w) => w.id === id);

  const makeWork = (s: State, d: Draft, status: Status): Work => {
    s.seq += 1;
    const used = s.works.filter((w) => w.status === "riding").map((w) => w.car);
    const w: Work = {
      ...d,
      id: newId(),
      no: s.seq,
      progress: d.progress || 0,
      total: d.total || null,
      chunk: d.chunk || 1,
      status,
      car: status === "riding" ? (CARS.find((c) => !used.includes(c)) ?? null) : null,
      issuedAt: now(),
      lastAt: now(),
      stamps: []
    };
    if (status === "riding" && w.car === null) w.status = "later";
    s.works.push(w);
    s.onboarded = true;
    return w;
  };

  const actions = {
    /** 切符を発行する。乗車なら割り当てた号車を返す */
    issue(d: Draft, status: Status): number | null {
      const car = status === "riding" ? (freeCar ?? null) : null;
      mutate((s) => void makeWork(s, d, status));
      return car;
    },
    loadSample() {
      mutate((s) => {
        for (const x of SAMPLES) {
          const { status, ago, ...d } = x;
          const w = makeWork(s, d, status);
          w.sample = true;
          const t = new Date(Date.now() - ago * 864e5).toISOString();
          w.issuedAt = new Date(Date.now() - (ago + 10) * 864e5).toISOString();
          w.lastAt = t;
          if (status === "riding") w.stamps = [{ kind: "kugiri", at: t, upto: 8 }];
        }
      });
    },
    clearSample() {
      mutate((s) => {
        s.works = s.works.filter((w) => !w.sample);
      });
    },
    board(id: string): number | null {
      const car = freeCar ?? null;
      if (car === null) return null;
      mutate((s) => {
        const w = s.works.find((x) => x.id === id);
        if (!w) return;
        w.status = "riding";
        w.car = car;
        w.lastAt = now();
      });
      return car;
    },
    alight(id: string, patch?: { progress: number; memo: string }) {
      mutate((s) => {
        const w = s.works.find((x) => x.id === id);
        if (!w) return;
        if (patch) Object.assign(w, patch);
        w.status = "later";
        w.car = null;
        w.lastAt = now();
      });
    },
    /** パンチの記録。区切りを越えたら区切りスタンプを押す */
    record(id: string, progress: number, memo: string): RecordResult {
      const w0 = byId(id);
      if (!w0) return { kind: "none", diff: 0 };
      const old = w0.progress;
      const c = Math.max(1, w0.chunk);
      let p = Math.max(0, progress);
      if (w0.total && p >= w0.total) p = w0.total;
      let result: RecordResult = { kind: "none", diff: p - old };
      if (w0.total && p >= w0.total) result = { kind: "done" };
      else if (p > old && Math.floor(p / c) > Math.floor(old / c)) result = { kind: "kugiri", upto: Math.floor(p / c) * c };
      mutate((s) => {
        const w = s.works.find((x) => x.id === id);
        if (!w) return;
        w.progress = p;
        w.memo = memo;
        w.lastAt = now();
        if (result.kind === "kugiri") w.stamps.push({ kind: "kugiri", at: now(), upto: result.upto });
      });
      return result;
    },
    setProgress(id: string, progress: number, memo: string) {
      mutate((s) => {
        const w = s.works.find((x) => x.id === id);
        if (w) Object.assign(w, { progress, memo });
      });
    },
    finish(id: string, note: string) {
      mutate((s) => {
        const w = s.works.find((x) => x.id === id);
        if (!w) return;
        w.note = note;
        w.status = "done";
        w.car = null;
        w.doneAt = now();
        w.lastAt = now();
        w.stamps.push({ kind: "done", at: now() });
      });
    },
    update(id: string, d: Draft) {
      mutate((s) => {
        const w = s.works.find((x) => x.id === id);
        if (w) Object.assign(w, d);
      });
    },
    discard(id: string) {
      mutate((s) => {
        s.works = s.works.filter((w) => w.id !== id);
      });
    },
    replaceAll(next: State) {
      setState({ ...next, updatedAt: Date.now() });
    }
  };

  return { state, riding, later, done, freeCar, byId, actions };
}

export type Store = ReturnType<typeof useStore>;
