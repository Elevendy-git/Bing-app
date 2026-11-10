import { FeedMenu, type FeedMenuProps } from "../../components/FeedMenu";
import { MenuSheet } from "../../components/MenuList/MenuSheet";

export function FeedOptionsSheet({ interactive = false, ...menuProps }: FeedMenuProps & { interactive?: boolean }) {
  return <MenuSheet label="Feed options" interactive={interactive} onDismiss={menuProps.onDismiss}>
    <FeedMenu {...menuProps} autoFocus={interactive} />
  </MenuSheet>;
}
