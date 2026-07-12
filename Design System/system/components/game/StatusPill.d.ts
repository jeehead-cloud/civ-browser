import * as React from "react";

export interface StatusPillProps {
  /** @default "neutral" */
  faction?: "player" | "ally" | "enemy" | "neutral";
  label: string;
}
