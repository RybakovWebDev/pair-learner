import dynamic from "next/dynamic";

import styles from "./page.module.css";

import Game from "@/components/Game";

const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  return (
    <main className={styles.main}>
      <Game />
      <Footer />
    </main>
  );
}
