import { useEffect, useState } from "react";
import { Icon } from "./parts";

export type Tab = "home" | "later" | "done";

const WINDOWS = 7;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 車窓ヘッダー。窓の灯りがゆっくり入れ替わり、外の灯りが流れていく */
export function Header({ onSettings }: { onSettings: () => void }) {
  const [lit, setLit] = useState(() => Array.from({ length: WINDOWS }, () => Math.random() < 0.55));
  const [lights] = useState(() =>
    Array.from({ length: 7 }, () => ({
      duration: 6 + Math.random() * 7,
      delay: -Math.random() * 10,
      bottom: 2 + Math.random() * 8
    }))
  );

  useEffect(() => {
    if (reducedMotion()) return;
    const t = setInterval(() => {
      const i = Math.floor(Math.random() * WINDOWS);
      setLit((l) => l.map((v, j) => (j === i ? !v : v)));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="win">
      <div className="win-top">
        <div className="logo">
          つづきから<small>NIGHT LINE</small>
        </div>
        <button className="x moon" onClick={onSettings} aria-label="設定とバックアップ">
          <Icon name="dark_mode" />
        </button>
      </div>
      <div className="windows" aria-hidden="true">
        {lit.map((on, i) => (
          <span key={i} className={on ? "lit" : ""} />
        ))}
      </div>
      <div className="scenery" aria-hidden="true">
        {lights.map((l, i) => (
          <i key={i} style={{ animationDuration: `${l.duration}s`, animationDelay: `${l.delay}s`, bottom: `${l.bottom}px` }} />
        ))}
      </div>
    </header>
  );
}

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "home", icon: "train", label: "いま見てる" },
  { id: "later", icon: "confirmation_number", label: "あとで" },
  { id: "done", icon: "verified", label: "完走" }
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="画面の切り替え">
      {TABS.map((t) => (
        <button key={t.id} className="tab" aria-current={tab === t.id ? "page" : undefined} onClick={() => onChange(t.id)}>
          <Icon name={t.icon} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export function Toast({ text, icon }: { text: string; icon: string }) {
  return (
    <div className="toast" role="status">
      <Icon name={icon} />
      <span>{text}</span>
    </div>
  );
}
