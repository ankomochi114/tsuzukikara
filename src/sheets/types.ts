export type FormMode = "inv" | "newLater" | "newRide" | "edit";

export type SheetState =
  | { type: "punch"; id: string }
  | { type: "menu"; id: string }
  | { type: "laterOpen"; id: string }
  | { type: "seat"; car: number }
  | { type: "form"; mode: FormMode; id?: string }
  | { type: "celebrate"; id: string; kind: "kugiri"; upto: number }
  | { type: "celebrate"; id: string; kind: "done" }
  | { type: "settings" };

export type Notify = (text: string, icon?: string) => void;
