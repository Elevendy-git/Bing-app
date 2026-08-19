import type { Meta, StoryObj } from "@storybook/react";
import { AppFooter, FooterTab } from "./AppFooter";
import storyStyles from "./AppFooter.stories.module.css";

const meta = {
  title: "Consumer/App Footer",
  component: AppFooter,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "390 × 52 px Bing App navigation footer using the hierarchy from 849:24365. Copilot is a non-interactive, fixed 78 px visual; Home and Collections are the only interactive destinations and fill the remaining width equally (156 px each). Every icon is centered in its own area. The device-owned Home Indicator is intentionally excluded. The five supplied icon designs are Home Regular/Filled (3070:38768, 3070:38766), Copilot Color (3070:38812), and Collections Empty Regular/Filled (3070:38810, 3070:38770). Use the toolbar for Light/Dark.",
      },
    },
  },
  argTypes: {
    selectedTab: { control: false },
    defaultSelectedTab: {
      control: "select",
      options: ["home", "collections"],
    },
    onSelectedTabChange: { control: false },
  },
} satisfies Meta<typeof AppFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Complete interactive footer; Home matches the selected state in Figma. */
export const Default: Story = {
  args: {
    defaultSelectedTab: "home",
  },
};

/** All five supplied icon designs; Copilot intentionally appears only once. */
export const TabStates: Story = {
  args: {
    defaultSelectedTab: "home",
  },
  render: () => (
    <div className={storyStyles.showcase}>
      <section className={storyStyles.group} aria-labelledby="home-state-title">
        <h3 className={storyStyles.groupTitle} id="home-state-title">
          Home
        </h3>
        <div className={storyStyles.states}>
          <div className={storyStyles.state}>
            <div className={storyStyles.iconFrame}>
              <FooterTab destination="home" />
            </div>
            <span className={storyStyles.stateLabel}>Rest</span>
          </div>
          <div className={storyStyles.state}>
            <div className={storyStyles.iconFrame}>
              <FooterTab destination="home" selected />
            </div>
            <span className={storyStyles.stateLabel}>Selected</span>
          </div>
        </div>
      </section>

      <section className={storyStyles.group} aria-labelledby="copilot-state-title">
        <h3 className={storyStyles.groupTitle} id="copilot-state-title">
          Copilot
        </h3>
        <div className={storyStyles.states}>
          <div className={storyStyles.state}>
            <div className={storyStyles.iconFrame}>
              <FooterTab destination="copilot" />
            </div>
            <span className={storyStyles.stateLabel}>Single</span>
          </div>
        </div>
      </section>

      <section className={storyStyles.group} aria-labelledby="collections-state-title">
        <h3 className={storyStyles.groupTitle} id="collections-state-title">
          Collections
        </h3>
        <div className={storyStyles.states}>
          <div className={storyStyles.state}>
            <div className={storyStyles.iconFrame}>
              <FooterTab destination="collections" />
            </div>
            <span className={storyStyles.stateLabel}>Rest</span>
          </div>
          <div className={storyStyles.state}>
            <div className={storyStyles.iconFrame}>
              <FooterTab destination="collections" selected />
            </div>
            <span className={storyStyles.stateLabel}>Selected</span>
          </div>
        </div>
      </section>
    </div>
  ),
};
