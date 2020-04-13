// @flow

import { compose } from 'redux';
import { withRouter } from 'react-router-dom';
import { RouterComponent } from './router';
import { withDaemonStatusCheck } from '../components/with-daemon-status-check';
import { withDeepLink } from '../components/with-deeplink';
import { withExportAllKeysMenuItem } from '../components/with-export-all-keys-menu-item';

export const Router = compose(
  withRouter,
  withExportAllKeysMenuItem,
  withDaemonStatusCheck,
  withDeepLink,
)(RouterComponent);
