// Word-pair sets for game tests, including the awkward data real users have: synonyms, repeated words, duplicates,
// words that appear on both sides, and unusual text. Every set is a list of [word1, word2].
import type { Pair } from "@/constants";

export const pairsFrom = (words: [string, string][], prefix = "p"): Pair[] =>
  words.map(([word1, word2], i) => ({ id: `${prefix}${i}`, user_id: "u", word1, word2, tag_ids: [] }));

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const PAIR_SETS = {
  /** Ordinary vocabulary, every word unique. */
  unique: pairsFrom([
    ["Cat", "Gato"],
    ["Dog", "Perro"],
    ["House", "Casa"],
    ["Water", "Agua"],
    ["Book", "Libro"],
    ["Sun", "Sol"],
    ["Moon", "Luna"],
    ["Tree", "Árbol"],
    ["Bread", "Pan"],
    ["Milk", "Leche"],
  ]),
  /** Synonyms: several pairs share their right-hand word. */
  sharedRight: pairsFrom([
    ["Cat", "Gato"],
    ["Kitty", "Gato"],
    ["Dog", "Perro"],
    ["Puppy", "Perro"],
    ["House", "Casa"],
    ["Home", "Casa"],
    ["Water", "Agua"],
    ["Book", "Libro"],
    ["Sun", "Sol"],
  ]),
  /** Synonyms the other way round: several pairs share their left-hand word. */
  sharedLeft: pairsFrom([
    ["Big", "Grande"],
    ["Big", "Gran"],
    ["Small", "Pequeño"],
    ["Small", "Chico"],
    ["Fast", "Rápido"],
    ["Fast", "Veloz"],
    ["Hot", "Caliente"],
    ["Cold", "Frío"],
    ["Slow", "Lento"],
  ]),
  /**
   * Shared words in both columns, chained (x-p, y-p, y-q, z-q). Matching "y"+"p" twice leaves "x" and "z" facing two
   * "q"s, which can't be paired (bug 1 in the 2026-11-09 review).
   */
  stranding: pairsFrom([
    ["x", "p"],
    ["y", "p"],
    ["y", "q"],
    ["z", "q"],
    ["a", "b"],
    ["c", "d"],
    ["e", "f"],
  ]),
  /** The same word on both sides (loanwords). */
  sameBothSides: pairsFrom([
    ["Taxi", "Taxi"],
    ["Hotel", "Hotel"],
    ["Radio", "Radio"],
    ["Piano", "Piano"],
    ["Chocolate", "Chocolate"],
    ["Cat", "Gato"],
    ["Dog", "Perro"],
  ]),
  /** A word that's the right side of one pair and the left side of another, so it can show in either column. */
  crossColumn: pairsFrom([
    ["Sun", "Sol"],
    ["Sol", "Soleil"],
    ["Soleil", "Sonne"],
    ["Moon", "Luna"],
    ["Luna", "Lune"],
    ["Star", "Estrella"],
    ["Sky", "Cielo"],
  ]),
  /** The same pair saved twice (different ids), plus others. */
  duplicates: pairsFrom([
    ["Cat", "Gato"],
    ["Cat", "Gato"],
    ["Dog", "Perro"],
    ["Dog", "Perro"],
    ["House", "Casa"],
    ["Water", "Agua"],
    ["Book", "Libro"],
  ]),
  /** Words that differ only by case or accents (matching is exact, so they're different words), plus one shared word. */
  caseAndAccents: pairsFrom([
    ["cat", "gato"],
    ["Cat", "Gato"],
    ["Tree", "Árbol"],
    ["Tree", "Arbol"],
    ["Papa", "Potato"],
    ["Papá", "Dad"],
    ["Book", "Libro"],
  ]),
  /** Emoji, non-Latin scripts and the longest allowed words (35 characters). */
  unusualText: pairsFrom([
    ["🔥", "💧"],
    ["🌞", "🌧️"],
    ["猫", "Cat"],
    ["Собака", "Dog"],
    ["a".repeat(35), "b".repeat(35)],
    ["Long phrase with several words here", "Una frase larga con varias palabras"],
    ["x", "y"],
  ]),
  /** The smallest pool the Learn screen accepts. */
  minimum: pairsFrom([
    ["Cat", "Gato"],
    ["Dog", "Perro"],
    ["House", "Casa"],
    ["Water", "Agua"],
    ["Book", "Libro"],
  ]),
  /** A big imported list (imports allow up to 300 pairs). */
  large: pairsFrom(range(300).map((i): [string, string] => [`word ${i}`, `palabra ${i}`])),
};

export type PairSetName = keyof typeof PAIR_SETS;

/** Sets where no word appears in more than one pair. */
export const UNIQUE_WORD_SETS: PairSetName[] = ["unique", "unusualText", "minimum", "large"];
/** Sets where a word can show more than once on a board (shared by pairs, or on both sides of one pair). */
export const SHARED_WORD_SETS: PairSetName[] = [
  "sharedRight",
  "sharedLeft",
  "stranding",
  "sameBothSides",
  "crossColumn",
  "duplicates",
  "caseAndAccents",
];
