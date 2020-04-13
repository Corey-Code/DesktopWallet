// @flow

// eslint-disable-next-line
import electron from 'electron';

export const openItem = (fullPath: string) => electron.shell.openItem(fullPath);
