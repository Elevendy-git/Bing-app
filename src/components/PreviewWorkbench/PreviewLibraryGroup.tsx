import type { PreviewTheme } from "./PhonePreview";
import type { PreviewComponentGroup } from "./previewTypes";
import { StaticPreview } from "./StaticPreview";
import styles from "./PreviewWorkbench.module.css";

interface PreviewLibraryGroupProps {
  group: PreviewComponentGroup;
  theme: PreviewTheme;
  showTitle: boolean;
}

export function PreviewLibraryGroup({ group, theme, showTitle }: PreviewLibraryGroupProps) {
  const overview = group.items.find((item) => item.id === group.overviewItemId);
  const items = group.items.filter((item) => item !== overview);

  return (
    <section className={styles.libraryGroup} aria-label={group.title}>
      {showTitle && <h2 className={styles.libraryGroupHeading}>{group.title}</h2>}
      {overview && (
        <article className={`${styles.componentOverview} ${overview.fullWidth ? styles.fullWidthCard : ""}`} aria-label={overview.title}>
          <h3>Overview</h3>
          <div className={`${styles.componentPreview} ${styles.overviewPreview}`} data-product="consumer" data-theme={theme}>
            <div className={styles.componentContent}>
              {overview.hasControls || overview.interactive ? overview.content : <StaticPreview>{overview.content}</StaticPreview>}
            </div>
          </div>
        </article>
      )}
      {items.length > 0 && (
        <div className={styles.componentGrid}>
          {items.map((item) => (
            <article className={`${styles.componentCard} ${item.fullWidth ? styles.fullWidthCard : ""}`} key={item.id}>
              <h3>{item.title}</h3>
              <div className={styles.componentPreview} data-product="consumer" data-theme={theme}>
                <div className={styles.componentContent}>
                  {item.hasControls || item.interactive ? item.content : <StaticPreview>{item.content}</StaticPreview>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
