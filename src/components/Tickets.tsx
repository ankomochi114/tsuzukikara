import { daysSince, md, posText, ticketNo, type Work } from "../lib/model";
import { Icon, KindLabel, Notches, RouteBar, SampleTag } from "./parts";

export function RidingTicket({ w, onPunch, onMenu }: { w: Work; onPunch: () => void; onMenu: () => void }) {
  return (
    <article className="ticket">
      <Notches />
      <div className="t-head">
        <KindLabel kind={w.kind} />
        <span className="t-tags">
          <SampleTag w={w} />
          <span className="t-car">{w.car}号車</span>
        </span>
      </div>
      <h3 className="t-title">{w.title}</h3>
      <div className="shiori">
        <div className="shiori-h">
          <Icon name="bookmark" />
          前回は {posText(w)}
        </div>
        {w.memo ? w.memo : <span className="faint">しおりメモはまだありません</span>}
      </div>
      <RouteBar w={w} />
      <div className="t-actions">
        <button className="btn primary" onClick={onPunch}>
          <Icon name="radio_button_checked" />
          見た分をパンチする
        </button>
        <button className="t-more" onClick={onMenu} aria-label="その他の操作">
          <Icon name="more_horiz" />
        </button>
      </div>
      <div className="t-foot">
        <span>
          {ticketNo(w.no)}　{posText(w)}
        </span>
        <span>途中下車前途有効</span>
      </div>
    </article>
  );
}

export function LaterTicket({ w, onClick }: { w: Work; onClick: () => void }) {
  return (
    <button className="ticket compact as-button" onClick={onClick}>
      <Notches />
      <div className="t-head">
        <KindLabel kind={w.kind} />
        <span className="t-tags">
          <SampleTag w={w} />
          <span className="pill">{w.progress > 0 ? `途中 ${w.progress}${w.unit}` : "未乗車"}</span>
        </span>
      </div>
      <div className="t-title">{w.title}</div>
      {w.memo ? (
        <div className="t-memo">
          <Icon name="bookmark" />
          <span>{w.memo}</span>
        </div>
      ) : w.reason ? (
        <div className="t-memo">
          <Icon name="favorite" />
          <span>{w.reason}</span>
        </div>
      ) : null}
    </button>
  );
}

export function DoneTicket({ w, tilt }: { w: Work; tilt: "a" | "b" }) {
  const days = Math.max(1, daysSince(w.issuedAt) - daysSince(w.doneAt));
  return (
    <article className={`ticket compact has-stamp tilt-${tilt}`}>
      <Notches />
      <div className="t-head">
        <span className="t-tags">
          <KindLabel kind={w.kind} />
          <SampleTag w={w} />
        </span>
      </div>
      <div className="t-title">{w.title}</div>
      <div className="t-memo">
        {w.total ? `全${w.total}${w.unit}` : `${w.progress}${w.unit}`}・旅の期間 {days}日
      </div>
      {w.note && <div className="shiori">{w.note}</div>}
      <div className="stamp">
        <b>完走</b>
        <span>{w.doneAt ? md(w.doneAt) : ""}</span>
      </div>
    </article>
  );
}

export function KugiriTicket({ w, upto, at, tilt }: { w: Work; upto: number; at: string; tilt: "a" | "b" }) {
  return (
    <article className={`ticket compact has-stamp sm tilt-${tilt}`}>
      <Notches />
      <div className="t-head">
        <KindLabel kind={w.kind} />
      </div>
      <div className="t-title">{w.title}</div>
      <div className="t-memo">
        {upto}
        {w.unit}まで到着
      </div>
      <div className="stamp k sm">
        <b>区切り</b>
        <span>{md(at)}</span>
      </div>
    </article>
  );
}
