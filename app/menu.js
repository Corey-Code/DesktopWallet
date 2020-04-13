// @flow
import path from 'path';
import { openExternal } from './utils/open-external';
import { openItem } from './utils/open-item';
import packageJson from '../package.json';
import { getVidulumFolder } from '../config/daemon/get-vidulum-folder';
import { isTestnet } from '../config/is-testnet';

const isMac = process.platform === 'darwin';
const DOCS_URL = 'https://vidulum.app/';
const VDL_CONF_PATH = path.join(getVidulumFolder(), 'vidulum.conf');
const VDL_MASTERNODE_CONF_PATH = path.join(getVidulumFolder(), 'masternode.conf');
const EXPLORER_URL = isTestnet()
  ? 'https://vdlt-explorer.vidulum.app/'
  : 'https://explorer.vidulum.app/';
const WEBWALLET_URL = 'https://wallet.vidulum.app';

const submenu = [
  {
    label: 'Open vidulum.conf',
    click() {
      openItem(VDL_CONF_PATH);
    },
  },
  {
    label: 'Open masternode.conf',
    click() {
      openItem(VDL_MASTERNODE_CONF_PATH);
    },
  },
  {
    label: 'Open Explorer',
    click() {
      openExternal(EXPLORER_URL);
    },
  },
  {
    label: 'Open Webwallet',
    click() {
      openExternal(WEBWALLET_URL);
    },
  },
  { type: 'separator' },
  {
    label: 'Exit',
    role: isMac ? 'close' : 'quit',
  },
];

const menu = [
  {
    label: 'Menu',
    submenu,
  },
];

const helpMenu = {
  role: 'help',
  submenu: [
    {
      label: `Vidulum Desktop Wallet Version v${packageJson.version}`,
      enabled: false,
    },
    {
      label: 'Get Help',
      click() {
        openExternal(DOCS_URL);
      },
    },
  ],
};

if (process.platform === 'darwin') {
  menu.unshift({
    label: packageJson.name,
    submenu,
  });

  menu.push({
    ...helpMenu,
    submenu: [
      ...helpMenu.submenu,
    ],
  });
} else {
  menu.push(helpMenu);
}

export const MENU = menu;
