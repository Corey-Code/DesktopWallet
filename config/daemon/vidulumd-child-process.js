// @flow

import cp from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import processExists from 'process-exists';
/* eslint-disable import/no-extraneous-dependencies */
import isDev from 'electron-is-dev';
import type { ChildProcess } from 'child_process';
import eres from 'eres';
import uuid from 'uuid/v4';
import findProcess from 'find-process';

/* eslint-disable-next-line import/named */
import { mainWindow } from '../electron';
import waitForDaemonClose from './wait-for-daemon-close';
import getBinariesPath from './get-binaries-path';
import getOsFolder from './get-os-folder';
import getDaemonName from './get-daemon-name';
import fetchParams from './run-fetch-params';
import { locateVidulumConf } from './locate-vidulum-conf';
import { locateMasternodeConf } from './locate-masternode-conf';
import { log } from './logger';
import store from '../electron-store';
import {
	parseVidulumConf,
	parseCmdArgs,
	generateArgsFromConf
} from './parse-vidulum-conf';
import { isTestnet } from '../is-testnet';
import { getDaemonProcessId } from './get-daemon-process-id';
import {
	EMBEDDED_DAEMON,
	VIDULUM_NETWORK,
	TESTNET,
	MAINNET,
} from '../../app/constants/vidulum-network';
import { parseMasternodeConf } from './parse-masternode-conf';

try {
	if (fs.existsSync(locateMasternodeConf)) {
		store.set('');
	}
} catch (err) {
	log('No masternode config');
}
const getDaemonOptions = ({
	username,
	password,
	useDefaultVidulumConf,
	optionsFromVidulumConf,
}) => {
	/*
    -showmetrics
        Show metrics on stdout
    -metricsui
        Set to 1 for a persistent metrics screen, 0 for sequential metrics
        output
    -metricsrefreshtime
        Number of seconds between metrics refreshes
  */

	const defaultOptions = [
		'-server=1',
		'-showmetrics=1',
		'-txindex=1',
		'-metricsui=0',
		'-metricsrefreshtime=1',
		`-rpcuser=${username}`,
		`-rpcpassword=${password}`,
		...(isTestnet() ? ['-testnet', '-addnode=vdlt-explorer.vidulum.app'] : ['-addnode=downloads.vidulum.app']),
		// Overwriting the settings with values taken from "vidulum.conf"
		...optionsFromVidulumConf,
	];

	if (useDefaultVidulumConf) defaultOptions.push(`-conf=${locateVidulumConf()}`);

	return Array.from(new Set([...defaultOptions, ...optionsFromVidulumConf]));
};

let resolved = false;

const VIDULUMD_PROCESS_NAME = getDaemonName();
const DAEMON_PROCESS_PID = 'DAEMON_PROCESS_PID';
const DAEMON_START_TIME = 'DAEMON_START_TIME';

let isWindowOpened = false;

const sendToRenderer = (event: string, message: Object, shouldLog: boolean = true) => {
	if (shouldLog) {
		log(message);
	}

	if (isWindowOpened) {
		if (!mainWindow.isDestroyed()) {
			mainWindow.webContents.send(event, message);
		}
	} else {
		const interval = setInterval(() => {
			if (isWindowOpened) {
				mainWindow.webContents.send(event, message);
				clearInterval(interval);
			}
		}, 1000);
	}
};

// eslint-disable-next-line
const runDaemon: () => Promise<?ChildProcess> = () => new Promise(async (resolve, reject) => {
	mainWindow.webContents.on('dom-ready', () => {
		isWindowOpened = true;
	});
	store.delete('rpcconnect');
	store.delete('rpcport');
	store.delete(DAEMON_PROCESS_PID);
	store.delete(DAEMON_START_TIME);

	const processName = path.join(getBinariesPath(), getOsFolder(), VIDULUMD_PROCESS_NAME);
	const isRelaunch = Boolean(process.argv.find(arg => arg === '--relaunch'));

	if (!mainWindow.isDestroyed()) mainWindow.webContents.send('vidulumd-params-download', 'Fetching params...');

	sendToRenderer('vidulum-daemon-status', {
		error: false,
		status:
			'Downloading network params, this may take some time depending on your connection speed',
	});

	const [err] = await eres(fetchParams());

	if (err) {
		sendToRenderer('vidulum-daemon-status', {
			error: true,
			status: `Error while fetching params: ${err.message}`,
		});

		return reject(new Error(err));
	}

	sendToRenderer('vidulum-daemon-status', {
		error: false,
		status: 'Vidulum Desktop Starting',
	});

	// In case of --relaunch on argv, we need wait to close the old vidulum daemon
	// a workaround is use a interval to check if there is a old process running
	if (isRelaunch) {
		await waitForDaemonClose(VIDULUMD_PROCESS_NAME);
	}

	const [, isRunning] = await eres(processExists(VIDULUMD_PROCESS_NAME));

	// This will parse and save rpcuser and rpcpassword in the store
	let [, optionsFromVidulumConf] = await eres(parseVidulumConf());
	const [, configFromMasternodeConf] = await eres(parseMasternodeConf());
	store.set('masternode_conf', configFromMasternodeConf);

	// if the user has a custom datadir and doesn't have a vidulum.conf in that folder,
	// we need to use the default vidulum.conf
	let useDefaultVidulumConf = false;

	if (optionsFromVidulumConf.datadir) {
		const hasDatadirConf = fs.existsSync(path.join(optionsFromVidulumConf.datadir, 'vidulum.conf'));

		if (hasDatadirConf) {
			optionsFromVidulumConf = await parseVidulumConf(
				path.join(String(optionsFromVidulumConf.datadir), 'vidulum.conf'),
			);
		} else {
			useDefaultVidulumConf = true;
		}
	}

	if (optionsFromVidulumConf.rpcconnect) store.set('rpcconnect', optionsFromVidulumConf.rpcconnect);
	if (optionsFromVidulumConf.rpcport) store.set('rpcport', optionsFromVidulumConf.rpcport);
	if (optionsFromVidulumConf.rpcuser) store.set('rpcuser', optionsFromVidulumConf.rpcuser);
	if (optionsFromVidulumConf.rpcpassword) store.set('rpcpassword', optionsFromVidulumConf.rpcpassword);

	log('Searching for vidulumd.pid');
	const daemonProcessId = getDaemonProcessId(optionsFromVidulumConf.datadir);

	if (daemonProcessId) {
		store.set(EMBEDDED_DAEMON, false);
		log(
			// eslint-disable-next-line
			`A daemon was found running in PID: ${daemonProcessId}. Starting Vidulum Desktop Wallet in external daemon mode.`,
		);

		// Command line args override vidulum.conf
		const [{ cmd, pid }] = await findProcess('pid', daemonProcessId);

		store.set(DAEMON_PROCESS_PID, pid);

		// We need grab the rpcuser and rpcpassword from either process args or vidulum.conf
		const {
			rpcuser, rpcpassword, rpcconnect, rpcport, testnet: isTestnetFromCmd,
		} = parseCmdArgs(
			cmd,
		);

		store.set(
			VIDULUM_NETWORK,
			isTestnetFromCmd === '1' || optionsFromVidulumConf.testnet === '1' ? TESTNET : MAINNET,
		);

		if (rpcuser) store.set('rpcuser', rpcuser);
		if (rpcpassword) store.set('rpcpassword', rpcpassword);
		if (rpcport) store.set('rpcport', rpcport);
		if (rpcconnect) store.set('rpcconnect', rpcconnect);

		return resolve();
	}

	log(
		"Vidulum Desktop Wallet couldn't find a `vidulumd.pid`, that means there is no instance of vidulum running on the machine, trying start built-in daemon",
	);

	store.set(EMBEDDED_DAEMON, true);

	if (!isRelaunch) {
		store.set(VIDULUM_NETWORK, optionsFromVidulumConf.testnet === '1' ? TESTNET : MAINNET);
	}

	if (!optionsFromVidulumConf.rpcuser) store.set('rpcuser', uuid());
	if (!optionsFromVidulumConf.rpcpassword) store.set('rpcpassword', uuid());
	//if (!optionsFromVidulumConf.rpcport) store.set('rpcport', '27676');

	const rpcCredentials = {
		username: store.get('rpcuser'),
		password: store.get('rpcpassword'),
	};

	if (isDev) log('Rpc Credentials', rpcCredentials);

	const childProcess = cp.spawn(
		processName,
		getDaemonOptions({
			...rpcCredentials,
			useDefaultVidulumConf,
			optionsFromVidulumConf: generateArgsFromConf(optionsFromVidulumConf),
		}),
		{
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);

	store.set(DAEMON_PROCESS_PID, childProcess.pid);

	childProcess.stdout.on('data', (data) => {
		if (!resolved) {
			store.set(DAEMON_START_TIME, Date.now());
			resolve(childProcess);
			resolved = true;
		}
	});


	childProcess.stderr.on('data', (data) => {
		log(data.toString());
		reject(new Error(data.toString()));
	});

	childProcess.on('error', reject);

	if (os.platform() === 'win32') {
		resolved = true;
		resolve(childProcess);
	}
});

// eslint-disable-next-line
export default runDaemon;
