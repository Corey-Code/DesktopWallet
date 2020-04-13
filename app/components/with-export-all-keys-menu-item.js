// @flow
import electron from 'electron'; // eslint-disable-line
import React, { type ComponentType, Component } from 'react';
import { SETTINGS_ROUTE } from '../constants/routes';
import { type RouterHistory, type Location} from 'react-router-dom';
import store from '../../config/electron-store';

import { LoadingScreen } from './loading-screen';

import rpc from '../../services/api';

type PassedProps = {
  history: RouterHistory,
  location: Location,
  isRunning: boolean,
};

type Props = {};

type State = {
  exportAllKeysClicked: boolean,
};

/* eslint-disable max-len */
export const withExportAllKeysMenuItem = (
  WrappedComponent: ComponentType<PassedProps>,
): ComponentType<$Diff<PassedProps, Props>> => class extends Component<PassedProps, State> {

    state = {
      exportAllKeysClicked: false,
    };

    componentDidMount() {
      electron.ipcRenderer.on(
        'export-all-keys-clicked',
        () => {
          this.setState(() => ({ exportAllKeysClicked: true }));
          const { history } = this.props;
          history.push(SETTINGS_ROUTE);
          setTimeout(() => document.getElementById('export-all-keys').click());
        },
      );
    }

    render() {
      const { exportAllKeysClicked } = this.state;

      return <WrappedComponent {...this.props} {...this.state} />;
    }
  };
