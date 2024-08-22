import styles from "./Spinner.module.css";

interface SpinnerProps {
  margin?: string;
  height?: string;
  width?: string;
  borderWidth?: string;
}

function Spinner({ margin = "10vh 0", height = "48px", width = "48px", borderWidth = "5px" }: SpinnerProps) {
  return (
    <div className={styles.spinnerWrapper} style={{ margin }}>
      <span className={styles.loader} style={{ height: height, width: width, borderWidth: borderWidth }}></span>
    </div>
  );
}

export default Spinner;
