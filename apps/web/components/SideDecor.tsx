import { Sprite } from "@/components/Sprite";

/**
 * Decorations in the empty side margins of wide screens: cobwebs, a hanging spider, a bat,
 * candles and a lantern. Pure decoration: hidden from screen readers, never clickable, gone below 1440px.
 */
function Web({ flip }: { flip?: boolean }) {
  return (
    <svg width="170" height="170" viewBox="0 0 170 170" style={{ position: "absolute", top: 0, [flip ? "right" : "left"]: 0, transform: flip ? "scaleX(-1)" : undefined, opacity: 0.5 }}>
      <g stroke="#C2B6CF" strokeWidth="1.2" fill="none" shapeRendering="crispEdges">
        <path d="M0 0 L170 40 M0 0 L120 120 M0 0 L40 170 M0 0 L160 90 M0 0 L85 160" />
        <path d="M30 7 Q34 22 26 30 Q20 34 7 30" />
        <path d="M62 15 Q66 44 50 58 Q36 68 13 62" />
        <path d="M96 23 Q100 66 76 88 Q56 104 20 96" />
        <path d="M132 31 Q134 90 102 118 Q74 140 28 132" />
      </g>
    </svg>
  );
}

function Candle({ h, delay }: { h: number; delay: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="flame" style={{ animationDelay: `${delay}s` }} />
      <div style={{ width: 4, height: 6, background: "#2C1E40" }} />
      <div style={{ width: 18, height: h, background: "linear-gradient(#F3ECDD,#C2B6CF)", boxShadow: "inset -4px 0 0 #00000022" }} />
    </div>
  );
}

export function SideDecor() {
  return (
    <div aria-hidden="true" className="sidedecor">
      <div className="sd-left">
        <Web />
        <div className="sd-thread">
          <div style={{ width: 1, height: 150, background: "#C2B6CF88", margin: "0 auto" }} />
          <Sprite kind="spider" scale={0.45} />
        </div>
        <div className="sd-candles">
          <Candle h={46} delay={0} />
          <Candle h={70} delay={0.4} />
          <Candle h={34} delay={0.9} />
        </div>
      </div>
      <div className="sd-right">
        <Web flip />
        <div className="sd-bat">
          <Sprite kind="bat" scale={0.5} />
        </div>
        <div className="sd-lantern">
          <div style={{ width: 2, height: 90, background: "#45345E", margin: "0 auto" }} />
          <div style={{ width: 34, height: 10, background: "#45345E", margin: "0 auto", borderRadius: "6px 6px 0 0" }} />
          <div className="lantern-glass" />
          <div style={{ width: 34, height: 8, background: "#45345E", margin: "0 auto" }} />
        </div>
      </div>
    </div>
  );
}
