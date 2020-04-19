// @flow
import path from "path";
import { openExternal } from "./utils/open-external";
import { openItem } from "./utils/open-item";
import packageJson from "../package.json";
import { getVidulumFolder } from "../config/daemon/get-vidulum-folder";
import { isTestnet } from "../config/is-testnet";

const isMac = process.platform === "darwin";
const DISCORD_URL = "https://discord.gg/QhV2Wx6";
const VDL_CONF_PATH = path.join(getVidulumFolder(), "vidulum.conf");
const VDL_MASTERNODE_CONF_PATH = path.join(
  getVidulumFolder(),
  "masternode.conf"
);
const EXPLORER_URL = isTestnet()
  ? "https://vdlt-explorer.vidulum.app/"
  : "https://explorer.vidulum.app/";
const WEBWALLET_URL = "https://wallet.vidulum.app";
const BOOTSTRAP_URL = "https://downloads.vidulum.app";

const submenu = [
  {
    label: "Open Web Wallet",
    click() {
      openExternal(WEBWALLET_URL);
    },
  },
  {
    label: "Download Bootstrap",
    click() {
      openExternal(BOOTSTRAP_URL);
    },
  },
  {
    label: "Open vidulum.conf",
    click() {
      openItem(VDL_CONF_PATH);
    },
  },
  {
    label: "Open masternode.conf",
    click() {
      openItem(VDL_MASTERNODE_CONF_PATH);
    },
  },
  {
    label: "Open VDL Explorer",
    click() {
      openExternal(EXPLORER_URL);
    },
  },
  { type: "separator" },
  {
    label: "Exit",
    role: isMac ? "close" : "quit",
  },
];

const menu = [
  {
    label: "Menu",
    submenu,
  },
];

const helpMenu = {
  role: "help",
  submenu: [
    {
      label: `Desktop Wallet v${packageJson.version}`,
      enabled: false,
    },
    {
      label: "Get Help on Discord",
      click() {
        openExternal(DISCORD_URL);
      },
    },
  ],
};

if (process.platform === "darwin") {
  menu.unshift({
    label: packageJson.name,
    submenu,
  });

  menu.push({
    ...helpMenu,
    submenu: [...helpMenu.submenu],
  });
} else {
  menu.push(helpMenu);
}

export const MENU = menu;
