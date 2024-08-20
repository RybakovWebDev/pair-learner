import dynamic from "next/dynamic";

import styles from "./page.module.css";

import AccountSettings from "@/components/AccountSettings";

const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  return (
    <main className={styles.main}>
      <AccountSettings />
      <Footer />
    </main>
  );
}
