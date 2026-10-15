import { type ReactNode, useEffect, useRef, useState } from "react";
import { Conductor, Icon, KindLabel, Notches, RouteBar } from "../components/parts";
import { daysSince, type Draft, KINDS, type Kind, md, newDraft, now, posText, route, ticketNo, UNIT_DEFAULT, UNITS, type Unit, type Work } from "../lib/model";
import { normalize, type Store } from "../lib/store";
import type { Tab } from "../components/Chrome";
import type { FormMode, Notify, SheetState } from "./types";

type Ctx = { store: Store; open: (s: SheetState) => void; close: () => void; notify: Notify; goto: (t: Tab) => void };

export function SheetHost({ sheet, ...ctx }: Ctx & { sheet: SheetState }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && ctx.close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx]);

  let body: ReactNode = null;
  switch (sheet.type) {
    case "punch":
      body = <PunchSheet key={sheet.id} id={sheet.id} {...ctx} />;
      break;
    case "menu":
      body = <MenuSheet id={sheet.id} {...ctx} />;
      break;
    case "laterOpen":
      body = <LaterSheet id={sheet.id} {...ctx} />;
      break;
    case "seat":
      body = <SeatSheet car={sheet.car} {...ctx} />;
      break;
    case "form":
      body = <FormSheet key={sheet.mode + (sheet.id ?? "")} mode={sheet.mode} id={sheet.id} {...ctx} />;
      break;
    case "celebrate":
      body = <CelebrateSheet key={sheet.id + sheet.kind} sheet={sheet} {...ctx} />;
      break;
    case "settings":
      body = <SettingsSheet {...ctx} />;
      break;
  }
  return (
    <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && ctx.close()}>
      <div className="sheet" role="dialog" aria-modal="true">
        {body}
      </div>
    </div>
  );
}

function Head({ title, close }: { title: ReactNode; close: () => void }) {
  return (
    <div className="sheet-head">
      <h2>{title}</h2>
      <button className="x" onClick={close} aria-label="閉じる">
        <Icon name="close" />
      </button>
    </div>
  );
}

/* パンチで記録 */
function PunchSheet({ id, store, open, close, notify }: Ctx & { id: string }) {
  const w = store.byId(id);
  const [pending, setPending] = useState(w?.progress ?? 0);
  const [popped, setPopped] = useState<number | null>(null);
  const [memo, setMemo] = useState(w?.memo ?? "");
  if (!w) return null;
  const clamp = (v: number) => Math.max(0, w.total ? Math.min(v, w.total) : v);
  const diff = pending - w.progress;

  const commit = () => {
    const r = store.actions.record(w.id, pending, memo.trim());
    if (r.kind === "done") open({ type: "celebrate", id: w.id, kind: "done" });
    else if (r.kind === "kugiri") open({ type: "celebrate", id: w.id, kind: "kugiri", upto: r.upto });
    else {
      close();
      notify(r.diff > 0 ? `${r.diff}${w.unit}分、進みました。いいペースですね` : "しおりメモを挟みました", "bookmark");
    }
  };

  let body: ReactNode;
  if (w.unit === "ページ") {
    body = (
      <>
        <div className="pager">
          <button onClick={() => setPending(clamp(pending - 10))}>−10</button>
          <input
            id="pgInput"
            type="number"
            inputMode="numeric"
            min={0}
            max={w.total ?? undefined}
            value={pending}
            onChange={(e) => setPending(clamp(parseInt(e.target.value) || 0))}
            aria-label="読んだページ"
          />
          <button onClick={() => setPending(clamp(pending + 10))}>＋10</button>
          <button onClick={() => setPending(clamp(pending + 50))}>＋50</button>
        </div>
        <div className="punch-hint">何ページまで読んだかを入れてください</div>
      </>
    );
  } else {
    const start = Math.max(1, w.progress - 2);
    let end = w.progress + 7;
    if (w.total) end = Math.min(w.total, end);
    const holes = [];
    for (let n = start; n <= end; n++) {
      const isEnd = !!w.total && n === w.total;
      const station = n % w.chunk === 0 || isEnd;
      const on = n <= pending;
      holes.push(
        <button
          key={n}
          className={`hole-btn ${station ? "station" : ""} ${isEnd ? "end" : ""} ${on ? "on" : ""} ${on && n === popped ? "pop" : ""}`}
          aria-pressed={on}
          aria-label={`${n}${w.unit}`}
          onClick={() => {
            setPending(n === pending ? n - 1 : n);
            setPopped(n);
          }}
        >
          {n}
        </button>
      );
    }
    body = (
      <>
        <div className="punch">{holes}</div>
        <div className="punch-hint">
          見たところまでの数字をタップしてください。オレンジの丸は区切り{w.total ? "、赤い丸は終点" : ""}です
        </div>
      </>
    );
  }

  return (
    <>
      <Head title="どこまで見ましたか？" close={close} />
      <div className="ticket">
        <Notches />
        <div className="t-head">
          <KindLabel kind={w.kind} />
          <span className="t-car">{w.car ? `${w.car}号車` : "あとで"}</span>
        </div>
        <div className="t-title">{w.title}</div>
        {body}
      </div>
      <Conductor>
        {diff > 0 ? (
          <>
            <b>
              {diff}
              {w.unit}
            </b>
            分、進みますね。よければ下の「記録する」を押してください。
          </>
        ) : diff < 0 ? (
          "少し戻しますね。"
        ) : (
          <>
            前回は<b>{posText(w)}</b>でした。今日はどこまで進みましたか。
          </>
        )}
      </Conductor>
      <label className="field">
        <span>
          しおりメモ <em>なくてもOK。次に思い出したいことを一言</em>
        </span>
        <textarea id="memoInput" maxLength={200} placeholder="例：主人公が旅に出る決心をしたところ" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>
      <div className="stack">
        <button className="btn primary" onClick={commit}>
          記録する
        </button>
        {w.status === "riding" && (
          <button
            className="btn ghost"
            onClick={() => {
              store.actions.alight(w.id, { progress: pending, memo: memo.trim() });
              close();
              notify("承知しました。しおりを挟んでおきますね", "bookmark");
            }}
          >
            しおりを挟んで途中下車
          </button>
        )}
        {!w.total && (
          <button
            className="btn ghost"
            onClick={() => {
              store.actions.setProgress(w.id, pending, memo.trim());
              open({ type: "celebrate", id: w.id, kind: "done" });
            }}
          >
            <Icon name="flag" />
            ここで完走にする
          </button>
        )}
      </div>
    </>
  );
}

function ConfirmDiscard({ w, store, close, notify, onCancel }: Ctx & { w: Work; onCancel: () => void }) {
  return (
    <>
      <Head title="切符を破棄する" close={close} />
      <div className="confirm">
        「{w.title}」の切符を破棄しますか。しおりメモもスタンプも消えて、記録には残りません。
        <div className="row">
          <button className="btn ghost" onClick={onCancel}>
            やめておく
          </button>
          <button
            className="btn danger"
            onClick={() => {
              store.actions.discard(w.id);
              close();
              notify("切符を破棄しました", "delete");
            }}
          >
            破棄する
          </button>
        </div>
      </div>
    </>
  );
}

function MenuSheet({ id, ...ctx }: Ctx & { id: string }) {
  const { store, open, close, notify } = ctx;
  const [confirm, setConfirm] = useState(false);
  const w = store.byId(id);
  if (!w) return null;
  if (confirm) return <ConfirmDiscard w={w} {...ctx} onCancel={() => setConfirm(false)} />;
  return (
    <>
      <Head title={w.title} close={close} />
      <div className="stack">
        <button className="btn ghost" onClick={() => open({ type: "form", mode: "edit", id })}>
          <Icon name="edit" />
          切符を書き直す
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            store.actions.alight(id);
            close();
            notify("承知しました。しおりを挟んでおきますね。またいつでもどうぞ", "bookmark");
          }}
        >
          <Icon name="logout" />
          途中下車して、あとでに戻す
        </button>
        <button className="btn ghost" onClick={() => open({ type: "celebrate", id, kind: "done" })}>
          <Icon name="flag" />
          ここで完走にする
        </button>
        <button className="btn danger" onClick={() => setConfirm(true)}>
          <Icon name="delete" />
          切符を破棄する
        </button>
      </div>
    </>
  );
}

function LaterSheet({ id, ...ctx }: Ctx & { id: string }) {
  const { store, open, close, notify } = ctx;
  const [confirm, setConfirm] = useState(false);
  const w = store.byId(id);
  if (!w) return null;
  if (confirm) return <ConfirmDiscard w={w} {...ctx} onCancel={() => setConfirm(false)} />;
  const car = store.freeCar;
  return (
    <>
      <Head title="切符入れ" close={close} />
      <div className="ticket">
        <Notches />
        <div className="t-head">
          <KindLabel kind={w.kind} />
          <span className="pill">{w.progress > 0 ? `途中 ${w.progress}${w.unit}` : "未乗車"}</span>
        </div>
        <div className="t-title">{w.title}</div>
        {w.reason && (
          <div className="t-memo">
            <Icon name="favorite" />
            <span>見たい理由：{w.reason}</span>
          </div>
        )}
        {w.memo && (
          <div className="shiori">
            <div className="shiori-h">
              <Icon name="bookmark" />
              しおりメモ
            </div>
            {w.memo}
          </div>
        )}
        <RouteBar w={w} />
        <div className="t-foot">
          <span>
            {ticketNo(w.no)}　発行 {md(w.issuedAt)}
          </span>
          <span>有効期限なし</span>
        </div>
      </div>
      <div className="stack">
        {car ? (
          <button
            className="btn primary"
            onClick={() => {
              const c = store.actions.board(id);
              close();
              if (c) notify(`ご乗車ありがとうございます。${c}号車へどうぞ`);
            }}
          >
            <Icon name="train" />
            {car}号車に乗車する
          </button>
        ) : (
          <Conductor>あいにく満席です。いま見てるの切符をどれか途中下車させると、乗車できます。</Conductor>
        )}
        <button className="btn ghost" onClick={() => open({ type: "form", mode: "edit", id })}>
          <Icon name="edit" />
          切符を書き直す
        </button>
        <button className="btn danger" onClick={() => setConfirm(true)}>
          <Icon name="delete" />
          切符を破棄する
        </button>
      </div>
    </>
  );
}

function SeatSheet({ car, store, open, close, notify }: Ctx & { car: number }) {
  const ls = store.later;
  return (
    <>
      <Head title={`${car}号車　空席`} close={close} />
      <Conductor>{ls.length ? "あとでの切符から選ぶか、新しく登録してください。" : "あとでの切符入れは空です。新しく登録しましょう。"}</Conductor>
      <button className="btn primary" onClick={() => open({ type: "form", mode: "newRide" })}>
        <Icon name="add" />
        新しく登録して乗せる
      </button>
      {ls.length > 0 && <div className="section-h">あとでの切符から乗せる</div>}
      <div className="list">
        {ls.map((w) => (
          <button
            key={w.id}
            className="ticket compact as-button"
            onClick={() => {
              const c = store.actions.board(w.id);
              close();
              if (c) notify(`ご乗車ありがとうございます。${c}号車へどうぞ`);
            }}
          >
            <Notches />
            <div className="t-head">
              <KindLabel kind={w.kind} />
              <span className="pill">{w.progress > 0 ? `途中 ${w.progress}${w.unit}` : "未乗車"}</span>
            </div>
            <div className="t-title">{w.title}</div>
          </button>
        ))}
      </div>
    </>
  );
}

const FORM_TITLES: Record<FormMode, string> = {
  newLater: "あとで見る作品を追加",
  newRide: "作品を乗せる",
  edit: "切符を書き直す",
  inv: "途中の作品を登録"
};

function FormSheet({ mode, id, store, close, notify }: Ctx & { mode: FormMode; id?: string }) {
  const editing = id ? store.byId(id) : undefined;
  const [d, setD] = useState<Draft>(() => (editing ? { ...editing } : newDraft("anime")));
  const [more, setMore] = useState(mode !== "newLater");
  const [adv, setAdv] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const car = store.freeCar;

  useEffect(() => titleRef.current?.focus(), [count]);

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const numOrNull = (v: string, min: number) => {
    const n = parseFloat(v);
    return isFinite(n) && n >= min ? n : null;
  };
  const changeKind = (k: Kind) => {
    const kd = KINDS[k];
    set(mode === "edit" ? { kind: k } : { kind: k, unit: kd.unit, chunk: kd.chunk, mins: kd.mins });
  };
  const changeUnit = (u: Unit) => set({ unit: u, chunk: UNIT_DEFAULT[u].chunk, mins: d.kind === "other" ? d.mins : UNIT_DEFAULT[u].mins });

  const finalDraft = (): Draft | null => {
    const title = d.title.trim();
    if (!title) {
      setError("作品名を入れてください");
      return null;
    }
    const progress = d.total && d.progress > d.total ? d.total : d.progress;
    return { ...d, title, progress, reason: d.reason.trim(), memo: d.memo.trim(), chunk: Math.max(1, Math.round(d.chunk || 1)) };
  };

  const save = () => {
    const f = finalDraft();
    if (!f) return;
    if (mode === "edit" && id) {
      store.actions.update(id, f);
      close();
      notify("切符を書き直しました", "edit");
    } else if (mode === "newRide") {
      const c = store.actions.issue(f, "riding");
      close();
      notify(c ? `ご乗車ありがとうございます。${c}号車へどうぞ` : "満席のため、あとでに入れました");
    } else {
      store.actions.issue(f, "later");
      close();
      notify("あとでに入れました。有効期限はありません", "confirmation_number");
    }
  };

  const inventory = (status: "riding" | "later") => {
    const f = finalDraft();
    if (!f) return;
    if (status === "riding" && !car) return;
    const c = store.actions.issue(f, status);
    notify(status === "riding" ? `「${f.title}」を${c}号車に乗せました` : `「${f.title}」をあとでに入れました`, "confirmation_number");
    setCount((n) => n + 1);
    setD(newDraft(f.kind));
    setError(null);
  };

  return (
    <>
      <Head title={FORM_TITLES[mode]} close={close} />
      {mode === "inv" && (
        <Conductor>
          {count ? (
            <>
              <b>{count}作品</b>登録しました。ほかにもあれば続けてどうぞ。
            </>
          ) : (
            "途中になっている作品を1つずつ教えてください。"
          )}
        </Conductor>
      )}
      <label className="field">
        <span>作品名</span>
        <input
          ref={titleRef}
          id="fTitle"
          type="text"
          maxLength={80}
          placeholder="例：灯台守の手紙"
          value={d.title}
          onChange={(e) => {
            set({ title: e.target.value });
            setError(null);
          }}
        />
      </label>
      {error && <div className="err">{error}</div>}
      <div className="field">
        <span>種類</span>
        <div className="chips">
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={d.kind === k} onClick={() => changeKind(k)}>
              <Icon name={KINDS[k].icon} />
              {KINDS[k].label}
            </button>
          ))}
        </div>
      </div>
      {!more ? (
        <button className="link" onClick={() => setMore(true)}>
          どこまで見たかも書く
        </button>
      ) : (
        <>
          <div className="field">
            <span>
              どこまで見た？ <em>覚えてなければ空でOK</em>
            </span>
            <div className="inline">
              <input
                id="fProg"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="0"
                value={d.progress || ""}
                onChange={(e) => set({ progress: Math.round(numOrNull(e.target.value, 0) ?? 0) })}
              />
              <select id="fUnit" aria-label="単位" value={d.unit} onChange={(e) => changeUnit(e.target.value as Unit)}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <span>まで</span>
            </div>
          </div>
          <div className="field">
            <span>
              全部で <em>わかれば</em>
            </span>
            <div className="inline">
              <input
                id="fTotal"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="例：12"
                value={d.total ?? ""}
                onChange={(e) => {
                  const t = numOrNull(e.target.value, 1);
                  set({ total: t ? Math.round(t) : null });
                }}
              />
              <span>{d.unit}</span>
            </div>
          </div>
          {adv ? (
            <>
              <div className="grid2">
                <label className="field">
                  <span>区切りの大きさ</span>
                  <input id="fChunk" type="number" min={1} inputMode="numeric" value={d.chunk || ""} onChange={(e) => set({ chunk: Math.round(numOrNull(e.target.value, 1) ?? 0) })} />
                </label>
                <label className="field">
                  <span>1{d.unit}の時間（分）</span>
                  <input id="fMins" type="number" min={0} step={0.5} inputMode="decimal" value={d.mins ?? ""} onChange={(e) => set({ mins: numOrNull(e.target.value, 0) })} />
                </label>
              </div>
              <label className="field">
                <span>見たいと思った理由</span>
                <input id="fReason" type="text" maxLength={120} placeholder="例：友達が泣けると言っていた" value={d.reason} onChange={(e) => set({ reason: e.target.value })} />
              </label>
              <label className="field">
                <span>しおりメモ</span>
                <textarea id="fMemo" maxLength={200} placeholder="例：第2部に入るところ" value={d.memo} onChange={(e) => set({ memo: e.target.value })} />
              </label>
            </>
          ) : (
            <button className="link" onClick={() => setAdv(true)}>
              くわしく設定する（区切り・メモなど）
            </button>
          )}
        </>
      )}
      <div className="stack">
        {mode === "inv" ? (
          <>
            <div className="field">
              <span>どうしますか？</span>
            </div>
            <div className="row">
              <button className="btn primary" aria-disabled={!car} onClick={() => inventory("riding")}>
                <Icon name="train" />
                いま見る
              </button>
              <button className="btn ghost" onClick={() => inventory("later")}>
                <Icon name="schedule" />
                あとで見る
              </button>
            </div>
            {!car && <p className="note">いま見てるは3作品までなので、満席です</p>}
            {count > 0 && (
              <button className="btn ghost" onClick={close}>
                登録を終える
              </button>
            )}
          </>
        ) : (
          <button className="btn primary" onClick={save}>
            {mode === "edit" ? "書き直す" : mode === "newRide" ? "乗せる" : "あとでに入れる"}
          </button>
        )}
      </div>
    </>
  );
}

function CelebrateSheet({ sheet, store, close, goto, notify }: Ctx & { sheet: Extract<SheetState, { type: "celebrate" }> }) {
  const w = store.byId(sheet.id);
  const [note, setNote] = useState("");
  const [stampDate] = useState(() => md(now()));
  if (!w) return null;
  const lights = (n: number) => (
    <div className="celebrate-lights" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.09}s` }} />
      ))}
    </div>
  );

  if (sheet.kind === "kugiri") {
    const r = route(w);
    return (
      <>
        <Head title="ひと区切り" close={close} />
        {lights(5)}
        <div className="ticket has-stamp">
          <Notches />
          <div className="t-head">
            <KindLabel kind={w.kind} />
          </div>
          <div className="t-title">{w.title}</div>
          <div className="t-memo ink">
            {sheet.upto}
            {w.unit}まで到着
          </div>
          <div className="stamp k slam">
            <b>区切り</b>
            <span>{stampDate}</span>
          </div>
        </div>
        <Conductor>
          ひと区切り、到着です。
          {r.remaining > 0 && (
            <>
              次の{r.isEnd ? "終点" : "区切り"}までは、あと
              <b>
                {r.remaining}
                {w.unit}
              </b>
              です。
            </>
          )}
        </Conductor>
        <button className="btn primary" onClick={close}>
          旅をつづける
        </button>
      </>
    );
  }

  const days = Math.max(1, daysSince(w.issuedAt));
  return (
    <>
      {lights(7)}
      <div className="finale-title">
        <div className="note spaced">終点</div>
        <div className="t-title">{w.title}</div>
      </div>
      <div className="ticket has-stamp">
        <Notches />
        <div className="t-head">
          <KindLabel kind={w.kind} />
        </div>
        <div className="t-memo ink">{w.total ? `全${w.total}${w.unit}` : `${w.progress}${w.unit}`}</div>
        <div className="t-foot">
          <span>{ticketNo(w.no)}</span>
        </div>
        <div className="stamp slam">
          <b>完走</b>
          <span>{stampDate}</span>
        </div>
      </div>
      <Conductor>終点です。長い旅、おつかれさまでした。</Conductor>
      <div className="stats">
        <div>
          <b>
            {w.progress}
            {w.unit}
          </b>
          <span>{w.unit === "ページ" ? "読んだ量" : "見た量"}</span>
        </div>
        <div>
          <b>{days}日</b>
          <span>旅の期間</span>
        </div>
      </div>
      <label className="field">
        <span>
          ひとこと感想 <em>なくてもOK</em>
        </span>
        <textarea id="noteInput" maxLength={200} placeholder="例：最終話の手紙で泣いた" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button
        className="btn primary"
        onClick={() => {
          const wasRiding = w.status === "riding";
          store.actions.finish(w.id, note.trim());
          close();
          goto("done");
          notify(wasRiding ? "いま見てるに空席ができました" : "完走した切符に入れました", "event_seat");
        }}
      >
        完走した切符に入れる
      </button>
    </>
  );
}

/* 設定とバックアップ */
function SettingsSheet({ store, close, notify }: Ctx) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof normalize> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `tsuzukikara-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notify("バックアップを書き出しました", "download");
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const s = normalize(JSON.parse(await f.text()));
      if (!s.works.length) throw new Error("empty");
      setPendingImport(s);
      setError(null);
    } catch {
      setError("このファイルは読み込めませんでした。つづきからで書き出したファイルを選んでください。");
    }
  };

  return (
    <>
      <Head title="設定とバックアップ" close={close} />
      <Conductor>記録はこの端末のブラウザの中に保存されています。機種変更の前などに、バックアップを書き出しておくと安心です。</Conductor>
      <div className="stack">
        <button className="btn ghost" onClick={exportJson}>
          <Icon name="download" />
          バックアップを書き出す
        </button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" />
          バックアップから読み込む
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        {error && <div className="err">{error}</div>}
        {pendingImport && (
          <div className="confirm">
            {pendingImport.works.length}枚の切符が入ったバックアップです。いまの記録をすべて置き換えますか。
            <div className="row">
              <button className="btn ghost" onClick={() => setPendingImport(null)}>
                やめておく
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  store.actions.replaceAll(pendingImport);
                  close();
                  notify("バックアップを読み込みました", "upload");
                }}
              >
                置き換える
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
