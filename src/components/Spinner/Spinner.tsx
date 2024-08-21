import styles from "./Spinner.module.css";

interface SpinnerProps {
  marginTop?: string;
  height?: string;
  width?: string;
  borderWidth?: string;
}

function Spinner({ marginTop = "10vh", height = "48px", width = "48px", borderWidth = "5px" }: SpinnerProps) {
  return (
    <div className={styles.spinnerWrapper} style={{ marginTop }}>
      <span className={styles.loader} style={{ height: height, width: width, borderWidth: borderWidth }}></span>
    </div>
  );
}

export default Spinner;
