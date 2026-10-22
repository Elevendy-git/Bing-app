import { Home24Filled, Home24Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { APP_FOOTER_COPILOT_ICON } from "./AppFooter.assets";
import styles from "./AppFooter.module.css";

export type SelectableFooterDestination = "home" | "collections";
export type FooterDestination = SelectableFooterDestination | "copilot";

export interface FooterTabProps {
  /** Destination represented by the icon. */
  destination: FooterDestination;
  /** Applies the Figma selected treatment. */
  selected?: boolean;
  /** Host-specific name for an icon destination. */
  label?: string;
  /** Called when the destination is chosen. */
  onSelect?: (destination: SelectableFooterDestination) => void;
}

export interface AppFooterProps {
  /** Width belongs to the embedding screen. */
  className?: string;
  /** Controlled selected destination. */
  selectedTab?: SelectableFooterDestination;
  /** Initial destination for the uncontrolled footer. */
  defaultSelectedTab?: SelectableFooterDestination;
  /** Called after a footer destination is selected. */
  onSelectedTabChange?: (destination: SelectableFooterDestination) => void;
  /** Accessible label for the footer navigation. */
  navigationLabel?: string;
  labels?: Partial<Record<FooterDestination, string>>;
}

const DESTINATION_LABELS: Record<FooterDestination, string> = {
  home: "Home",
  copilot: "Copilot",
  collections: "Collections",
};

function CopilotIcon() {
  return (
    <img
      className={styles.icon}
      src={APP_FOOTER_COPILOT_ICON}
      alt=""
      aria-hidden="true"
      data-icon-variant="single"
    />
  );
}

export function CollectionsEmptyIcon({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <svg
        className={styles.icon}
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        fill="none"
        data-icon-variant="filled"
      >
        <path
          d="M9.11297 8.80009C9.45238 8.50289 9.85738 8.27432 10.3033 8.13877L10.5504 8.07424L10.7103 8.04335L10.8858 8.01892L11.0656 8.00389L11.25 7.99875H18.75C20.483 7.99875 21.8992 9.3552 21.9949 11.0643L22 11.2487V18.7487C22 20.4818 20.6435 21.898 18.9344 21.9936L18.75 21.9987H11.25C9.51697 21.9987 8.10075 20.6423 8.00515 18.9332L8 18.7487V11.2487L8.01742 10.9102L8.07897 10.5334L8.13766 10.3099L8.21895 10.0736L8.30497 9.87239L8.38656 9.71013L8.48081 9.54668L8.62681 9.32969L8.7213 9.20696L8.85601 9.0507L8.9638 8.93881L9.11297 8.80009ZM15.5818 4.23284L15.6345 4.40964L16.328 6.998L11.25 6.99875C8.90279 6.99875 7 8.90154 7 11.2487L7.00056 17.6816C5.69932 17.6051 4.52962 16.7445 4.10539 15.4544L4.05269 15.2776L2.11155 8.03311C1.66301 6.35913 2.6067 4.6401 4.23284 4.10539L4.40964 4.05269L11.6541 2.11155C13.3281 1.66301 15.0471 2.6067 15.5818 4.23284Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg
      className={styles.icon}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      data-icon-variant="regular"
    >
      <path
        d="M11.0656 8.00389L11.25 7.99875H18.75C20.483 7.99875 21.8992 9.3552 21.9949 11.0643L22 11.2487V18.7487C22 20.4818 20.6435 21.898 18.9344 21.9936L18.75 21.9987H11.25C9.51697 21.9987 8.10075 20.6423 8.00515 18.9332L8 18.7487V11.2487C8 9.51571 9.35646 8.0995 11.0656 8.00389ZM18.75 9.49875H11.25C10.3318 9.49875 9.57881 10.2059 9.5058 11.1052L9.5 11.2487V18.7487C9.5 19.6669 10.2071 20.4199 11.1065 20.4929L11.25 20.4987H18.75C19.6682 20.4987 20.4212 19.7916 20.4942 18.8923L20.5 18.7487V11.2487C20.5 10.2822 19.7165 9.49875 18.75 9.49875ZM15.5818 4.23284L15.6345 4.40964L16.327 6.998H14.774L14.1856 4.79787C13.9355 3.86431 12.9759 3.31029 12.0423 3.56044L4.79787 5.50158C3.91344 5.73856 3.36966 6.61227 3.52756 7.49737L3.56044 7.64488L5.50158 14.8893C5.69372 15.6064 6.30445 16.0996 7.00045 16.1764L7.00056 17.6816C5.69932 17.6051 4.52962 16.7445 4.10539 15.4544L4.05269 15.2776L2.11155 8.03311C1.66301 6.35913 2.6067 4.6401 4.23284 4.10539L4.40964 4.05269L11.6541 2.11155C13.3281 1.66301 15.0471 2.6067 15.5818 4.23284Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DestinationIcon({
  destination,
  selected,
}: Pick<FooterTabProps, "destination" | "selected">) {
  if (destination === "copilot") return <CopilotIcon />;
  if (destination === "collections") {
    return <CollectionsEmptyIcon selected={selected ?? false} />;
  }
  return selected ? (
    <Home24Filled data-icon-variant="filled" />
  ) : (
    <Home24Regular data-icon-variant="regular" />
  );
}

/** Footer action. Copilot is fixed at 78 px; edge destinations fill their row. */
export function FooterTab({ destination, selected = false, onSelect, label }: FooterTabProps) {
  if (destination === "copilot") {
    return (
      <span
        className={`${styles.tab} ${styles.staticTab}`}
        role="img"
        aria-label={label ?? DESTINATION_LABELS[destination]}
        data-destination={destination}
        data-state="single"
      >
        <DestinationIcon destination={destination} selected={false} />
      </span>
    );
  }

  return (
    <button
      className={`${styles.tab} ${selected ? styles.selected : ""}`}
      type="button"
      aria-label={label ?? DESTINATION_LABELS[destination]}
      aria-current={selected ? "page" : undefined}
      data-destination={destination}
      data-state={selected ? "selected" : "rest"}
      onClick={() => onSelect?.(destination)}
    >
      <DestinationIcon destination={destination} selected={selected} />
    </button>
  );
}

/**
 * Bing App bottom footer from Figma node 849:24397.
 * It is uncontrolled by default and can also be driven through selectedTab.
 */
export function AppFooter({
  selectedTab,
  defaultSelectedTab = "home",
  onSelectedTabChange,
  navigationLabel = "Bing app navigation",
  labels,
  className,
}: AppFooterProps) {
  const [internalSelectedTab, setInternalSelectedTab] =
    useState<SelectableFooterDestination>(defaultSelectedTab);
  const currentTab = selectedTab ?? internalSelectedTab;

  const selectTab = (destination: SelectableFooterDestination) => {
    if (selectedTab === undefined) setInternalSelectedTab(destination);
    onSelectedTabChange?.(destination);
  };

  return (
    <footer className={[styles.root, className].filter(Boolean).join(" ")} aria-label={navigationLabel}>
      <nav className={styles.actions} aria-label={navigationLabel}>
        {(["home", "copilot", "collections"] as const).map((destination) => (
          <FooterTab
            destination={destination}
            label={labels?.[destination]}
            selected={currentTab === destination}
            onSelect={selectTab}
            key={destination}
          />
        ))}
      </nav>
    </footer>
  );
}
