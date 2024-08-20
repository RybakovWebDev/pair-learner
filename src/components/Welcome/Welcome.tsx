import styles from "./Welcome.module.css";

function Welcome() {
  return (
    <section className={styles.mainWrapper}>
      <section className={styles.hero}>
        <h2>
          Welcome to <br />
          Pair Learner
        </h2>
        <p>
          Create, edit, and learn word pairs <br /> in any language
        </p>
        {/* <Link href='/signup' className={styles.ctaButton}>
          Get Started
        </Link> */}
      </section>

      <section className={styles.features}>
        <div className={styles.feature}>
          <h3>Create Word Pairs</h3>
          <p>Add and organize your own word pairs</p>
        </div>
        <div className={styles.feature}>
          <h3>Customize Categories</h3>
          <p>Sort words by language or topic</p>
        </div>
        <div className={styles.feature}>
          <h3>Play Matching Game</h3>
          <p>Test your memory with our interactive game</p>
        </div>
      </section>
    </section>
  );
}

export default Welcome;
