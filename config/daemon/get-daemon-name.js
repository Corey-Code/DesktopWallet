// @flow
import os from 'os';

export default () => (os.platform() === 'win32' ? 'vidulumd.exe' : 'vidulumd');
