"use client";
import { useEffect, useRef, useState } from "react";
import type { CreatureKind } from "@haunted/core";
import { Sprite } from "@/components/Sprite";

/**
 * First-visit tour of the haunted house (4 steps). Shown once per browser; the "?" button reopens it.
 * Stores only a "seen" flag in localStorage, nothing else.
 */
const KEY = "haunted:onboarded:v1";
const STEPS: { kind: CreatureKind; title: string; text: string; where: string }[] = [
  { kind: "ghost", title: "Every problem is a creature", text: "Ghosts are leaked keys, vampires are old packages, spiders are unsafe code. A bigger creature means a bigger risk.", where: "The cards on the left" },
  { kind: "spider", title: "Hover to fix it", text: "Move your mouse over a creature. A popup shows the fix and a preview of the change. One click opens a pull request in your repo.", where: "Hover any card" },
  { kind: "bat", title: "The terminal keeps score", text: "The haunting score goes from 0 to 100. Lower is better. Click a line like \"ghosts 3\" to show only those creatures.", where: "The terminal on the right" },
  { kind: "banshee", title: "Log in, then go deeper", text: "Log in with GitHub to fix your own repo. The séance room runs your tests in a sealed sandbox. The report exports it all.", where: "The buttons at the top" },
];

export function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setI(0);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const finish = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* storage blocked: the tour simply shows again */
    }
    onClose();
  };
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;

  return (
    <dialog ref={ref} onClose={finish} aria-labelledby="tour-title" className="m-auto rounded-2xl border-2 border-lantern bg-crypt p-0 text-bone backdrop:bg-plum-night/80" style={{ width: "min(520px, 92vw)" }}>
      <div key={i} className="rise" style={{ padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 96, height: 96, flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "center", background: "#160E22", borderRadius: 16, border: "1px solid #33244A" }}>
            <Sprite kind={step.kind} scale={0.7} />
          </div>
          <div>
            <div className="font-mono" style={{ fontSize: 12, color: "#9C8FAE" }}>
              step {i + 1} of {STEPS.length} · {step.where}
            </div>
            <h2 id="tour-title" className="font-display" style={{ margin: "4px 0 0", fontWeight: 400, fontSize: 34, lineHeight: 1.05 }}>{step.title}</h2>
          </div>
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 16, lineHeight: 1.55, color: "#E6DCEB" }}>{step.text}</p>

        <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <div aria-hidden="true" style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, n) => (
              <span key={n} style={{ width: n === i ? 22 : 8, height: 8, borderRadius: 4, background: n === i ? "#F2B544" : "#45345E", transition: "width .2s" }} />
            ))}
          </div>
          <button type="button" onClick={finish} style={{ marginLeft: "auto", height: 42, padding: "0 14px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: "#C2B6CF", cursor: "pointer" }}>
            Skip
          </button>
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} style={{ height: 42, padding: "0 14px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: "#F3ECDD", cursor: "pointer" }}>
              Back
            </button>
          )}
          <button type="button" autoFocus onClick={() => (last ? finish() : setI(i + 1))} style={{ height: 42, padding: "0 18px", borderRadius: 10, border: 0, background: "#F2B544", color: "#241604", fontWeight: 800, cursor: "pointer" }}>
            {last ? "Start hunting" : "Next"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** True when the tour has not been seen in this browser yet. */
export function useFirstVisit(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* no storage: skip the tour */
    }
  }, []);
  return [open, setOpen];
}
