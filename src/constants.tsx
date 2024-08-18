import { CSSProperties } from "react";

export interface Pair {
  word1: string;
  word2: string;
  category?: string;
  id: string;
}

interface User {
  name: string;
  categories: string[];
  pairs: Pair[];
  pairsTesting: Pair[];
}

export const testUser: User = {
  name: "Aloy",
  categories: ["Apartment", "Family", "Testing"],
  pairs: [
    { word1: "Room", word2: "Zimmer", category: "Apartment", id: "99aa4b44-3e88-4863-aad0-c89f1d15b6fe" },
    { word1: "Kitchen", word2: "Küche", category: "Apartment", id: "bdf00d5b-3f39-4db6-a88b-8c4b95286e3b" },
    { word1: "Bathroom", word2: "Badezimmer", category: "Apartment", id: "bb210790-8c98-47de-aa6a-91b007144bd7" },
    { word1: "Living room", word2: "Wohnzimmer", category: "Apartment", id: "ae4bc14c-51cc-40e0-a7c3-1999d5dbf42d" },
    { word1: "Bedroom", word2: "Schlafzimmer", category: "Apartment", id: "3c032197-54f1-4717-9dde-d9fc73426ad6" },
    { word1: "Balcony", word2: "Balkon", category: "Apartment", id: "3d24c632-680b-4c90-b093-8f9958c16061" },
    { word1: "Hallway", word2: "Flur", category: "Apartment", id: "5452f4ca-c0c2-478b-b179-e8908830c655" },
    { word1: "Ceiling", word2: "Decke", category: "Apartment", id: "2cde2228-099f-42c8-9eae-5a70a8feddd4" },
    { word1: "Floor", word2: "Boden", category: "Apartment", id: "7086387b-897f-4ab1-8987-4773cdba1159" },
    { word1: "Wall", word2: "Wand", category: "Apartment", id: "fcbcdfe1-b555-4b01-8863-39fbd9eeb0d9" },
    { word1: "Window", word2: "Fenster", category: "Apartment", id: "df69aadd-4dab-48a3-8c09-d00efd178871" },
    { word1: "Door", word2: "Tür", category: "Apartment", id: "28ced8a0-33b3-4b49-aa82-dd749fd6307d" },
    { word1: "Mother", word2: "Mutter", category: "Family", id: "7d16a002-7ba4-45ec-9ce8-d3752c0cbf8c" },
    { word1: "Father", word2: "Vater", category: "Family", id: "78b17f67-afa8-485d-a106-11c881215b78" },
    { word1: "Sister", word2: "Schwester", category: "Family", id: "e926c5fc-8a9b-43dc-ac20-514f84e1644b" },
    { word1: "Brother", word2: "Bruder", category: "Family", id: "fce031b1-9a4e-4620-a702-6d6d27ff1752" },
    { word1: "Grandmother", word2: "Großmutter", category: "Family", id: "d6e90bd2-00bb-4960-837e-d86d253c52f8" },
    { word1: "Grandfather", word2: "Großvater", category: "Family", id: "c8050f98-eab6-4500-a8f5-9d466737b27c" },
    { word1: "Aunt", word2: "Tante", category: "Family", id: "74a944cf-672e-4f99-9d11-f5290932deeb" },
    { word1: "Uncle", word2: "Onkel", category: "Family", id: "9c3f2742-942c-41c4-8fa5-900bdb8dfb21" },
    { word1: "Cousin", word2: "Cousin", category: "Family", id: "dcf8ece3-8dea-4a31-a8fe-1d1ba82964a6" },
    { word1: "Niece", word2: "Nichte", category: "Family", id: "7cb8498d-c022-40e7-b105-c6eaf45941c7" },
    { word1: "Nephew", word2: "Neffe", category: "Family", id: "6caf1de5-a1e3-4ab4-a7ea-4bd4a5a56daf" },
    { word1: "Family", word2: "Familie", category: "Family", id: "6352b6ca-50c8-4ed8-a478-4da9c948a76f" },
    { word1: "One", word2: "One", category: "Testing", id: "41b7a94e-3ca6-4f6c-9b00-e8806c7ad633" },
    { word1: "One", word2: "One", category: "Testing", id: "e2e585c0-2b2b-4a83-949b-ed521fa655da" },
    { word1: "Two", word2: "Two", category: "Testing", id: "feca00b5-9802-4b70-8e54-6faa4c002f22" },
    { word1: "Three", word2: "Three", category: "Testing", id: "2f1d0944-48ee-4988-853a-09378ccd9806" },
    { word1: "Four", word2: "Four", category: "Testing", id: "0c829343-8a78-416e-9394-e8ca46d66964" },
    { word1: "Five", word2: "Five", category: "Testing", id: "108e76f0-c3cb-4aa6-b19f-15b076083778" },
    { word1: "Six", word2: "Six", category: "Testing", id: "93a54553-3335-4b93-a256-afad278120fc" },
    { word1: "Seven", word2: "Seven", category: "Testing", id: "4b3ad931-4227-4cb0-928d-b62ae02778ac" },
    { word1: "Eight", word2: "Eight", category: "Testing", id: "b06ebfc6-5bf9-4738-9326-6ac2c1859137" },
    { word1: "Nine", word2: "Nine", category: "Testing", id: "13232632-dac3-4390-847a-f7c8f9c6c438" },
    { word1: "Ten", word2: "Ten", category: "Testing", id: "ee0b008c-f9fb-4a90-8d40-884df5b2bbe8" },
    { word1: "Eleven", word2: "Eleven", category: "Testing", id: "8f8acdbe-dc40-4bf0-901b-bf521cb0677d" },
    { word1: "Twelve", word2: "Twelve", category: "Testing", id: "4c2e25c9-dadf-4754-8b87-ba9c7522a3ac" },
  ],
  pairsTesting: [
    { word1: "One", word2: "One", id: "92e3a174-8d54-4595-82a2-a511a081e46d" },
    { word1: "One", word2: "One", id: "1ef72dbb-84dd-4de2-85d4-cd9fe6232feb" },
    { word1: "Two", word2: "Two", id: "801af586-947d-4d21-8ada-0f037e9419be" },
    { word1: "Three", word2: "Three", id: "3cdee072-edc8-4500-98f7-bc0b785d3661" },
    { word1: "Four", word2: "Four", id: "154e1ab7-97c5-44d7-a2e8-29d41ad59e97" },
    { word1: "Five", word2: "Five", id: "7e2d0ea6-d34c-4068-a179-b33517ad8acd" },
    { word1: "Six", word2: "Six", id: "49b353b5-13ab-4c4d-8202-014ef4730b4d" },
    { word1: "Seven", word2: "Seven", id: "1dfa8c1b-a4bd-4033-a32b-915c642d4246" },
    { word1: "Eight", word2: "Eight", id: "b6e76f7d-da55-49c7-b4c5-ede4e7be79e2" },
    { word1: "Nine", word2: "Nine", id: "5bd5dc29-a53e-4004-bfe8-aa1a79f34324" },
    { word1: "Ten", word2: "Ten", id: "f5441b48-3d2f-49e4-8a04-c1f5f34f556c" },
    { word1: "Eleven", word2: "Eleven", id: "8b8937dc-ebf9-44a8-a7e2-d0075943701a" },
    { word1: "Twelve", word2: "Twelve", id: "9d9bc708-f925-47de-913e-6dab055262a7" },
  ],
};

export const MENU_ITEMS = [
  { title: "Play", slug: "play" },
  { title: "Edit words", slug: "words" },
  { title: "Logout", slug: "logout" },
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
  "--color-background-highlight": "hsl(0 0% 60%)",
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
