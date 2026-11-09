import { PreviewWorkbench } from "@/components/PreviewWorkbench";
import { BingAppPrototype } from "./screens/BingAppPrototype";
import { previewComponentGroups } from "./previewCatalog";
import { previewKeyScreens } from "./keyScreenCatalog";
import { useMicrosoftAccount } from "./auth/useMicrosoftAccount";
import { useRewardsSnapshot } from "./auth/useRewardsSnapshot";

export function App() {
  const microsoft = useMicrosoftAccount();
  const rewards = useRewardsSnapshot(microsoft.account?.email);
  return (
    <PreviewWorkbench
      title="Homepage"
      componentGroups={previewComponentGroups}
      screens={previewKeyScreens}
    >
      <BingAppPrototype timeSource="system" initialRecentState="empty" feedSource="msn"
        account={microsoft.account} authentication={microsoft.authentication} rewardsSnapshot={rewards} />
    </PreviewWorkbench>
  );
}
