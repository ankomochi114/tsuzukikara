import { Conductor, Icon } from "../components/parts";
import { DoneTicket, KugiriTicket, LaterTicket, RidingTicket } from "../components/Tickets";
import { CARS, daysSince, greet, type Work } from "../lib/model";
import type { Store } from "../lib/store";
import type { SheetState } from "../sheets/types";

type Props = { store: Store; open: (s: SheetState) => void };

export function HomeView({ store, open }: Props) {
  const { state, riding, actions } = store;

  if (!state.works.length && !state.onboarded) {
    return (
      <>
        <Conductor>はじめまして、車掌です。途中になっている漫画やアニメ、本を、少しずつ最後まで楽しむお手伝いをします。</Conductor>
        <ol className="steps">
          <Step n={1} title="途中の作品を登録" sub="作品が1枚の切符になります" />
          <Step n={2} title="見たらパンチ" sub="見た話数をタップするだけ" />
          <Step n={3} title="区切りと完走でスタンプ" sub="切符にスタンプが押されます" />
        </ol>
        <div className="stack">
          <button className="btn primary big" onClick={() => open({ type: "form", mode: "inv" })}>
            <Icon name="add" />
            途中の作品を登録する
          </button>
          <button className="link" onClick={actions.loadSample}>
            まずは見本で触ってみる
          </button>
        </div>
      </>
    );
  }

  const back = riding.find((w) => daysSince(w.lastAt) >= 5);
  const g = greet();
  return (
    <>
      <Conductor>
        {back ? (
          <>
            おかえりなさいませ。<b>{back.title}</b>の切符はまだ有効ですよ。
          </>
        ) : !riding.length ? (
          <>{g}。ただいま全席空席です。見たい作品があれば、下の空席をタップしてどうぞ。お休みの日があっても大丈夫です。</>
        ) : (
          <>
            {g}、本日もおつかれさまです。見終わったら<b>パンチ</b>で記録してくださいね。
          </>
        )}
      </Conductor>
      <div className="label">
        <Icon name="train" />
        いま見てる　{riding.length} / 3
      </div>
      {CARS.map((c) => {
        const w = riding.find((x) => x.car === c);
        return w ? (
          <RidingTicket key={w.id} w={w} onPunch={() => open({ type: "punch", id: w.id })} onMenu={() => open({ type: "menu", id: w.id })} />
        ) : (
          <button key={`seat${c}`} className="seat" onClick={() => open({ type: "seat", car: c })}>
            <Icon name="add" />
            作品を乗せる<b>（{c}号車・空席）</b>
          </button>
        );
      })}
      {riding.length < 3 && <p className="note">空席は埋めなくて大丈夫です</p>}
    </>
  );
}

function Step({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <li>
      <span className="num">{n}</span>
      <div>
        <b>{title}</b>
        <span>{sub}</span>
      </div>
    </li>
  );
}

export function LaterView({ store, open }: Props) {
  const { state, later, actions } = store;
  const hasSample = state.works.some((w) => w.sample);
  return (
    <>
      <h2 className="view-title">あとで</h2>
      <Conductor>
        切符はすべて<b>有効期限なし</b>です。乗りたくなったら、いつでもどうぞ。
      </Conductor>
      <div className="row">
        <button className="btn ghost" onClick={() => open({ type: "form", mode: "newLater" })}>
          <Icon name="add" />
          タイトルだけで追加
        </button>
        <button className="btn ghost" onClick={() => open({ type: "form", mode: "inv" })}>
          <Icon name="library_add" />
          まとめて登録
        </button>
      </div>
      <div className="list">
        {later.length ? (
          later.map((w) => <LaterTicket key={w.id} w={w} onClick={() => open({ type: "laterOpen", id: w.id })} />)
        ) : (
          <p className="empty">切符入れは空です。思い出した作品があれば、タイトルだけで入れておけます。</p>
        )}
      </div>
      {hasSample && (
        <button className="btn ghost" onClick={actions.clearSample}>
          見本の切符を片付ける
        </button>
      )}
    </>
  );
}

export function DoneView({ store }: { store: Store }) {
  const { state, done } = store;
  const y = new Date().getFullYear();
  const thisYear = done.filter((w) => w.doneAt && new Date(w.doneAt).getFullYear() === y).length;
  const kugiri: { w: Work; upto: number; at: string }[] = [];
  for (const w of state.works) for (const s of w.stamps) if (s.kind === "kugiri") kugiri.push({ w, upto: s.upto, at: s.at });
  kugiri.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <>
      <h2 className="view-title">
        完走した切符
        <small>
          {y}年 {thisYear}枚
        </small>
      </h2>
      <div className="list">
        {done.length ? (
          done.map((w, i) => <DoneTicket key={w.id} w={w} tilt={i % 2 ? "b" : "a"} />)
        ) : (
          <p className="empty">終点に着いた切符が、スタンプ付きでここに並びます。</p>
        )}
      </div>
      {kugiri.length > 0 && (
        <>
          <div className="section-h">
            <Icon name="approval" />
            区切りスタンプ
          </div>
          <div className="list">
            {kugiri.slice(0, 20).map((k, i) => (
              <KugiriTicket key={`${k.w.id}-${k.at}`} w={k.w} upto={k.upto} at={k.at} tilt={i % 2 ? "b" : "a"} />
            ))}
          </div>
        </>
      )}
      {done.length > 0 && <Conductor>たくさん旅をされましたね。</Conductor>}
    </>
  );
}
