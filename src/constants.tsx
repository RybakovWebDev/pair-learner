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

// export interface User {
//   name: string;
//   categories: string[];
//   pairs: Pair[];
// }

// useEffect(() => {
//   const storedUser = localStorage.getItem("user");
//   if (!storedUser) {
//     const initialUser = {
//       name: "Test User",
//       categories: categories,
//       pairs: pairs, // You can add some initial pairs here if you want
//     };
//     localStorage.setItem("user", JSON.stringify(initialUser));
//   }
// }, []);

// export const testUser: User = {
//   name: "Aloy",
//   categories: ["Apartment", "Family", "Testing"],
//   pairs: [
//     { word1: "Room", word2: "Zimmer", category: "Apartment", id: "99aa4b44-3e88-4863-aad0-c89f1d15b6fe" },
//     { word1: "Kitchen", word2: "Küche", category: "Apartment", id: "bdf00d5b-3f39-4db6-a88b-8c4b95286e3b" },
//     { word1: "Bathroom", word2: "Badezimmer", category: "Apartment", id: "bb210790-8c98-47de-aa6a-91b007144bd7" },
//     { word1: "Living room", word2: "Wohnzimmer", category: "Apartment", id: "ae4bc14c-51cc-40e0-a7c3-1999d5dbf42d" },
//     { word1: "Bedroom", word2: "Schlafzimmer", category: "Apartment", id: "3c032197-54f1-4717-9dde-d9fc73426ad6" },
//     { word1: "Balcony", word2: "Balkon", category: "Apartment", id: "3d24c632-680b-4c90-b093-8f9958c16061" },
//     { word1: "Hallway", word2: "Flur", category: "Apartment", id: "5452f4ca-c0c2-478b-b179-e8908830c655" },
//     { word1: "Ceiling", word2: "Decke", category: "Apartment", id: "2cde2228-099f-42c8-9eae-5a70a8feddd4" },
//     { word1: "Floor", word2: "Boden", category: "Apartment", id: "7086387b-897f-4ab1-8987-4773cdba1159" },
//     { word1: "Wall", word2: "Wand", category: "Apartment", id: "fcbcdfe1-b555-4b01-8863-39fbd9eeb0d9" },
//     { word1: "Window", word2: "Fenster", category: "Apartment", id: "df69aadd-4dab-48a3-8c09-d00efd178871" },
//     { word1: "Door", word2: "Tür", category: "Apartment", id: "28ced8a0-33b3-4b49-aa82-dd749fd6307d" },
//     { word1: "Mother", word2: "Mutter", category: "Family", id: "7d16a002-7ba4-45ec-9ce8-d3752c0cbf8c" },
//     { word1: "Father", word2: "Vater", category: "Family", id: "78b17f67-afa8-485d-a106-11c881215b78" },
//     { word1: "Sister", word2: "Schwester", category: "Family", id: "e926c5fc-8a9b-43dc-ac20-514f84e1644b" },
//     { word1: "Brother", word2: "Bruder", category: "Family", id: "fce031b1-9a4e-4620-a702-6d6d27ff1752" },
//     { word1: "Grandmother", word2: "Großmutter", category: "Family", id: "d6e90bd2-00bb-4960-837e-d86d253c52f8" },
//     { word1: "Grandfather", word2: "Großvater", category: "Family", id: "c8050f98-eab6-4500-a8f5-9d466737b27c" },
//     { word1: "Aunt", word2: "Tante", category: "Family", id: "74a944cf-672e-4f99-9d11-f5290932deeb" },
//     { word1: "Uncle", word2: "Onkel", category: "Family", id: "9c3f2742-942c-41c4-8fa5-900bdb8dfb21" },
//     { word1: "Cousin", word2: "Cousin", category: "Family", id: "dcf8ece3-8dea-4a31-a8fe-1d1ba82964a6" },
//     { word1: "Niece", word2: "Nichte", category: "Family", id: "7cb8498d-c022-40e7-b105-c6eaf45941c7" },
//     { word1: "Nephew", word2: "Neffe", category: "Family", id: "6caf1de5-a1e3-4ab4-a7ea-4bd4a5a56daf" },
//     { word1: "Family", word2: "Familie", category: "Family", id: "6352b6ca-50c8-4ed8-a478-4da9c948a76f" },
//     { word1: "One", word2: "One", category: "Testing", id: "41b7a94e-3ca6-4f6c-9b00-e8806c7ad633" },
//     { word1: "One", word2: "One", category: "Testing", id: "e2e585c0-2b2b-4a83-949b-ed521fa655da" },
//     { word1: "Two", word2: "Two", category: "Testing", id: "feca00b5-9802-4b70-8e54-6faa4c002f22" },
//     { word1: "Three", word2: "Three", category: "Testing", id: "2f1d0944-48ee-4988-853a-09378ccd9806" },
//     { word1: "Four", word2: "Four", category: "Testing", id: "0c829343-8a78-416e-9394-e8ca46d66964" },
//     { word1: "Five", word2: "Five", category: "Testing", id: "108e76f0-c3cb-4aa6-b19f-15b076083778" },
//     { word1: "Six", word2: "Six", category: "Testing", id: "93a54553-3335-4b93-a256-afad278120fc" },
//     { word1: "Seven", word2: "Seven", category: "Testing", id: "4b3ad931-4227-4cb0-928d-b62ae02778ac" },
//     { word1: "Eight", word2: "Eight", category: "Testing", id: "b06ebfc6-5bf9-4738-9326-6ac2c1859137" },
//     { word1: "Nine", word2: "Nine", category: "Testing", id: "13232632-dac3-4390-847a-f7c8f9c6c438" },
//     { word1: "Ten", word2: "Ten", category: "Testing", id: "ee0b008c-f9fb-4a90-8d40-884df5b2bbe8" },
//     { word1: "Eleven", word2: "Eleven", category: "Testing", id: "8f8acdbe-dc40-4bf0-901b-bf521cb0677d" },
//     { word1: "Twelve", word2: "Twelve", category: "Testing", id: "4c2e25c9-dadf-4754-8b87-ba9c7522a3ac" },
//   ],
// };

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

export const MENU_ITEMS = [
  { title: "Play", slug: "play", href: "/play", icon: <Play size={22} /> },
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
  "--color-background-highlight-win": string;
  "--color-background-highlight-fail": string;
  "--color-background-secondary": string;
  "--color-gradient-lightness": string;
  "--color-border-success": string;
  "--color-border-failure": string;
}

export const LIGHT_COLORS: ThemeColors = {
  "--color-text": "hsl(0 0% 0%)",
  "--color-text-secondary": "hsl(0 0% 0%)",
  "--color-text-danger": "hsl(0, 100%, 52%)",
  "--color-underline": "0, 0, 0",
  "--color-background": "hsl(0 0% 92%)",
  "--color-background-highlight": "hsl(0 0% 65%)",
  "--color-background-highlight-win": "hsl(128, 100%, 70%)",
  "--color-background-highlight-fail": "hsl(0, 100%, 67%)",
  "--color-background-secondary": "hsla(0, 0%, 0%, 0.3)",
  "--color-gradient-lightness": "92%",
  "--color-border-success": "hsl(0, 0%, 0%)",
  "--color-border-failure": "hsl(0, 0%, 0%)",
};

export const DARK_COLORS: ThemeColors = {
  "--color-text": "hsl(0 0% 92%)",
  "--color-text-secondary": "hsl(0 0% 0%)",
  "--color-text-danger": "hsl(0, 100%, 40%)",
  "--color-underline": "250, 250, 250",
  "--color-background": "hsl(186, 69%, 9%)",
  "--color-background-highlight": "hsl(186, 69%, 22%)",
  "--color-background-highlight-win": "hsl(186, 69%, 35%)",
  "--color-background-highlight-fail": "hsl(0, 50%, 22%)",
  "--color-background-secondary": "hsla(0, 0%, 80%, 0.4)",
  "--color-gradient-lightness": "8%",
  "--color-border-success": "hsl(120, 73%, 63%)",
  "--color-border-failure": "hsl(0, 100%, 63%)",
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
