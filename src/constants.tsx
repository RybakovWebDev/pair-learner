import { Variants } from "framer-motion";
import { CSSProperties } from "react";
import { Edit, Globe, Linkedin, Play, User } from "react-feather";

export interface Pair {
  id: string;
  user_id: string;
  word1: string;
  word2: string;
  tag_ids: string[];
  created_at?: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
  tempId?: string;
}

export interface UserCategory {
  id: string;
  user_id: string;
  category: string;
  created_at?: string;
}

export const DEMO_PAIRS = [
  { word1: "Learn", word2: "Aprender", id: "5e1b0c34-7b93-4126-aed5-2d54a39d7e36" },
  { word1: "Imparare", word2: "Oppia", id: "d9a9432c-299e-4d0c-9fbc-598c7dcf72d3" },
  { word1: "Lernen", word2: "Apprendre", id: "6c2440f4-85d7-48e2-a739-d57f5cfb59e0" },
  { word1: "Uczyć się", word2: "学ぶ", id: "3f75f316-5f9f-4a69-a81b-7e35aefd5d78" },
  { word1: "学习", word2: "Lära sig", id: "7eaeac9f-0f1a-464b-b8de-0c64f0dcbb59" },
  { word1: "Učiti", word2: "Învăța", id: "ae3bcbb2-2fd7-43af-94ff-7d32039542c6" },
  { word1: "Вчитися", word2: "Μαθαίνω", id: "9f9c1c1e-2f27-44c5-9a8c-501781b45dbe" },
  { word1: "Lære", word2: "Mācīties", id: "73ba4d0a-8c68-48ad-a2f3-e7b1f1e9e1d2" },
];

export const DEMO_PAIRS_EMOJI = [
  { word1: "🔥", word2: "💧", id: "a1b2c3d4-5678-90ab-cdef-1234567890ab", user_id: "user_abc123", tag_ids: [] },
  { word1: "😀", word2: "😢", id: "b2c3d4e5-6789-01ab-cdef-2345678901bc", user_id: "user_def456", tag_ids: [] },
  { word1: "🌞", word2: "🌧️", id: "c3d4e5f6-7890-12ab-cdef-3456789012cd", user_id: "user_ghi789", tag_ids: [] },
  { word1: "👍", word2: "👎", id: "d4e5f6g7-8901-23ab-cdef-4567890123de", user_id: "user_jkl012", tag_ids: [] },
  { word1: "😈", word2: "😇", id: "e5f6g7h8-9012-34ab-cdef-5678901234ef", user_id: "user_mno345", tag_ids: [] },
  { word1: "🔑", word2: "🔒", id: "f6g7h8i9-0123-45ab-cdef-6789012345fg", user_id: "user_pqr678", tag_ids: [] },
  { word1: "🍅", word2: "🍏", id: "g7h8i9j0-1234-56ab-cdef-7890123456gh", user_id: "user_stu901", tag_ids: [] },
  { word1: "😼", word2: "🐶", id: "h8i9j0k1-2345-67ab-cdef-8901234567ij", user_id: "user_vwx234", tag_ids: [] },
  { word1: "🍔", word2: "🍟", id: "j0k1l2m3-4567-89ab-cdef-0123456789lm", user_id: "user_bcd678", tag_ids: [] },
  { word1: "💡", word2: "🔌", id: "k1l2m3n4-5678-90ab-cdef-1234567890mn", user_id: "user_efg789", tag_ids: [] },
];

export const MENU_ITEMS = [
  { title: "Learn", slug: "learn", href: "/learn", icon: <Play size={22} /> },
  { title: "Word Editor", slug: "words", href: "/edit", icon: <Edit size={22} /> },
  { title: "Account", slug: "account", href: "/account", icon: <User size={22} /> },
];

export const rowCountOptions = [3, 4, 5];

interface ThemeColors extends CSSProperties {
  "--color-text": string;
  "--color-text-secondary": string;
  "--color-text-danger": string;
  "--color-underline": string;
  "--color-background": string;
  "--color-background-highlight": string;
  "--color-background-feature": string;
  "--color-background-highlight-win": string;
  "--color-background-highlight-fail": string;
  "--color-background-secondary": string;
  "--color-gradient-lightness": string;
  "--color-border-success": string;
  "--color-border-failure": string;
  "--color-sparkles": string;
}

export const LIGHT_COLORS: ThemeColors = {
  "--color-text": "hsl(0 0% 0%)",
  "--color-text-secondary": "hsl(0 0% 0%)",
  "--color-text-danger": "hsl(0, 100%, 52%)",
  "--color-underline": "0, 0, 0",
  "--color-background": "hsl(186, 51%, 92%)",
  "--color-background-highlight": "hsl(183, 23%, 53%)",
  "--color-background-feature": "hsl(180, 92%, 28%)",
  "--color-background-highlight-win": "hsl(128, 100%, 70%)",
  "--color-background-highlight-fail": "hsl(0, 100%, 67%)",
  "--color-background-secondary": "hsla(0, 0%, 0%, 0.3)",
  "--color-gradient-lightness": "92%",
  "--color-border-success": "hsl(0, 0%, 0%)",
  "--color-border-failure": "hsl(0, 0%, 0%)",
  "--color-sparkles": "hsl(47, 100%, 50%)",
};

export const DARK_COLORS: ThemeColors = {
  "--color-text": "hsl(0 0% 92%)",
  "--color-text-secondary": "hsl(0 0% 0%)",
  "--color-text-danger": "hsl(0, 100%, 40%)",
  "--color-underline": "250, 250, 250",
  "--color-background": "hsl(186, 69%, 9%)",
  "--color-background-highlight": "hsl(186, 69%, 22%)",
  "--color-background-feature": "hsl(186, 69%, 22%)",
  "--color-background-highlight-win": "hsl(186, 69%, 35%)",
  "--color-background-highlight-fail": "hsl(0, 50%, 22%)",
  "--color-background-secondary": "hsla(0, 0%, 80%, 0.4)",
  "--color-gradient-lightness": "8%",
  "--color-border-success": "hsl(120, 73%, 63%)",
  "--color-border-failure": "hsl(0, 100%, 63%)",
  "--color-sparkles": "hsl(47, 100%, 50%)",
};

export const smoothSpring = {
  type: "spring",
  damping: 60,
  stiffness: 500,
};

export const SOCIAL_LINKS = [
  {
    slug: "website",
    href: "https://www.rybakov.dev/",
    ariaLabelText: "Visit Andrey Rybakov's personal website",
    icon: <Globe strokeWidth={1} />,
  },
  {
    slug: "linkedin",
    href: "https://www.linkedin.com/in/andrey-rybakov-webdev",
    ariaLabelText: "Visit Andrey Rybakov's LinkedIn profile",
    icon: <Linkedin strokeWidth={1} />,
  },
];

export const supportEmail = "pairlearner.contact@gmail.com";

export const donationLinks = {
  paypal: "https://paypal.me/anryedit?country.x=GE&locale.x=en_US",
  kofi: "https://ko-fi.com/rybakov",
};

export const simpleFadeVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

export const controlsVariants: Variants = {
  enabled: {
    opacity: 1,
    pointerEvents: "auto" as const,
  },
  disabled: {
    opacity: 0.5,
    pointerEvents: "none" as const,
  },
};
