import dynamic from "next/dynamic";

import styles from "./page.module.css";

import Welcome from "@/components/Welcome";
import PairsDemo from "@/components/PairsDemo";

const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <Welcome />
      </div>
      <Footer />
    </main>
  );
}
