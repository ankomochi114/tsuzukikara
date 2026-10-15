import { useCallback, useRef, useState } from "react";
import { Header, type Tab, TabBar, Toast } from "./components/Chrome";
import { useStore } from "./lib/store";
import { SheetHost } from "./sheets/Sheets";
import type { SheetState } from "./sheets/types";
import { DoneView, HomeView, LaterView } from "./views/Views";

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toast, setToast] = useState<{ text: string; icon: string; key: number } | null>(null);
  const toastTimer = useRef<number>();

  const notify = useCallback((text: string, icon = "train") => {
    setToast({ text, icon, key: Date.now() });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
  const close = useCallback(() => setSheet(null), []);
  const goto = useCallback((t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  }, []);

  return (
    <div id="app">
      <Header onSettings={() => setSheet({ type: "settings" })} />
      <main>
        {tab === "home" && <HomeView store={store} open={setSheet} />}
        {tab === "later" && <LaterView store={store} open={setSheet} />}
        {tab === "done" && <DoneView store={store} />}
      </main>
      <TabBar
        tab={tab}
        onChange={(t) => {
          setSheet(null);
          goto(t);
        }}
      />
      {sheet && <SheetHost sheet={sheet} store={store} open={setSheet} close={close} notify={notify} goto={goto} />}
      {toast && <Toast key={toast.key} text={toast.text} icon={toast.icon} />}
    </div>
  );
}
