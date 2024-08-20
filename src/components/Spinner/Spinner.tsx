import styles from "./Spinner.module.css";

interface SpinnerProps {
  marginTop?: string;
}

function Spinner({ marginTop = "10vh" }: SpinnerProps) {
  return (
    <div className={styles.spinnerWrapper} style={{ marginTop }}>
      <span className={styles.loader}></span>
    </div>
  );
}

export default Spinner;
