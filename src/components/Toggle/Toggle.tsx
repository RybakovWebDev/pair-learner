import styles from "./Toggle.module.css";

interface ToggleProps {
  column?: boolean;
  labelText: string;
  checked: boolean;
  onChange: () => void;
}

function Toggle({ column, labelText, checked, onChange }: ToggleProps) {
  return (
    <label className={styles.toggleLabel} style={{ flexDirection: column ? "column" : "row" }}>
      <span className={styles.labelText} style={{ marginBottom: column ? "0.5rem" : 0 }}>
        {labelText}
      </span>
      <div className={styles.switchContainer}>
        <input type='checkbox' className={styles.toggleInput} checked={checked} onChange={onChange} />
        <span className={`${styles.slider} ${styles.sliderRound}`}></span>
      </div>
    </label>
  );
}

export default Toggle;
