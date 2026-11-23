const R = 34;
const C = 2 * Math.PI * R;

export function ScoreRing({ score }: { score: number }) {
  const filled = (Math.max(0, Math.min(100, score)) / 100) * C;
  return (
    <div className="relative size-24 shrink-0" role="img" aria-label={`Haunting score ${score} of 100`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" stroke="var(--color-dust)" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke="var(--color-lantern)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${C}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none tabular-nums">{score}</span>
        <span className="text-[10px] text-bone/60">/100</span>
      </div>
    </div>
  );
}
