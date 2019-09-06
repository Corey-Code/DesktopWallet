// @flow
import path from 'path';
import cp from 'child_process';

import getBinariesPath from './get-binaries-path';
import { log } from './logger';

// The beggining ;p this first promise fires off vidulum-fetch-params

export default (): Promise < * > => new Promise((resolve, reject) => {
  const processName = path.join(getBinariesPath(), 'vidulum-fetch-params');

  const childProcess = cp.spawn(processName);

  childProcess.stdout.on('data', data => log(data.toString()));
  childProcess.stderr.on('data', data => log(data.toString()));
  childProcess.on('error', reject);
  childProcess.on('exit', (code, err) => {
    if (code !== 0 || err) {
      reject(new Error(err));
    }
    resolve();
  });
});
