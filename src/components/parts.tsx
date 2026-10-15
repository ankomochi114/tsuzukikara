import type { ReactNode } from "react";
import { fmtMin, KINDS, type Kind, route, type Work } from "../lib/model";

export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`ms ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

export function Conductor({ children }: { children: ReactNode }) {
  return (
    <div className="conductor">
      <div className="cap">
        <Icon name="train" />
      </div>
      <div className="bubble">{children}</div>
    </div>
  );
}

export function Notches() {
  return (
    <>
      <span className="notch t" />
      <span className="notch b" />
    </>
  );
}

export function KindLabel({ kind }: { kind: Kind }) {
  const k = KINDS[kind] ?? KINDS.other;
  return (
    <span className="t-kind">
      <Icon name={k.icon} />
      {k.label}
    </span>
  );
}

export function SampleTag({ w }: { w: Pick<Work, "sample"> }) {
  return w.sample ? <span className="tag-sample">見本</span> : null;
}

/** 区切りを駅に見立てた進み具合 */
export function RouteBar({ w }: { w: Pick<Work, "progress" | "chunk" | "total" | "unit" | "mins"> }) {
  const r = route(w);
  const pct = Math.round(r.frac * 100);
  return (
    <>
      <div className="route" aria-hidden="true">
        <span className="st" />
        <div className="rail">
          <div className="rail-done" style={{ width: `${pct}%` }} />
          <span className="ms train" style={{ left: `${pct}%` }}>
            train
          </span>
        </div>
        <span className={`st ${r.isEnd ? "end" : ""}`} />
      </div>
      <div className="route-labels">
        <span>{r.prev === 0 ? "はじまり" : `${r.prev}${w.unit}`}</span>
        <b>
          {r.isEnd ? "終点" : "区切り"} {r.next}
          {w.unit}
        </b>
      </div>
      <div className="route-left">
        次の{r.isEnd ? "終点" : "区切り"}まで あと{r.remaining}
        {w.unit}
        {w.mins ? `（${fmtMin(r.remaining * w.mins)}）` : ""}
      </div>
    </>
  );
}
