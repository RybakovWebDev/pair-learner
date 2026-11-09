// Visual timings for the board, in ms. These only affect how things look: the game never waits for an animation to
// finish, so a stalled animation can't freeze it. (Game timings live in engine.ts TIMINGS. A leaving pair in endless mode
// fades out until the engine replaces it, so that fade takes its length from the engine.)
export const FADE = {
  /** A new pair fading into the slots of a replaced one in endless mode. */
  cellIn: { normal: 300, fast: 150 },
  /** The whole board fading out before a new deal shows (new round, Refresh, Stop, settings changes). */
  boardOut: 300,
} as const;
