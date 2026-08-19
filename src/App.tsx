import { BingSearchBox } from "@/components/BingSearchBox";
import styles from "./App.module.css";

export function App() {
  return (
    <main className={styles.page} data-product="consumer">
      <BingSearchBox />
    </main>
  );
}

