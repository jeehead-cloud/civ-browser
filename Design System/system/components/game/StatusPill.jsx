import React from "react";

const toneMap = {
  player: "var(--faction-player)",
  ally: "var(--faction-ally)",
  enemy: "var(--faction-enemy)",
  neutral: "var(--faction-neutral)",
};

export function StatusPill({ faction = "neutral", label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", font: "var(--text-data-sm)", color: "var(--text-secondary)" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: toneMap[faction] || toneMap.neutral, flexShrink: 0 }} />
      {label}
    </span>
  );
}
