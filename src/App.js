import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { createTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import './App.css';

import Menu from './components/Menu';
import Measure from './components/Measure';
import Result from './components/Result';

function App() {
  document.title = window.location.toString().includes('bgpeen')
    ? 'bgpeen - measure your scores'
    : 'good at games? how do you know?';
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          type: prefersDarkMode ? 'dark' : 'light',
          graph: {
            background: {
              light: 'rgba(63, 81, 181, 0.25)',
              dark: 'rgba(255, 205, 86, 0.25)',
            },
            border: {
              light: 'rgba(63, 81, 181, 0.5)',
              dark: 'rgba(255, 205, 86, 0.5)',
            },
            point: {
              light: 'rgba(63, 81, 181, 1)',
              dark: 'rgba(255, 205, 86, 1)',
            },
          },
        },
      }),
    [prefersDarkMode]
  );

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="App">
          <Menu />
          <Switch>
            <Route path="/:id/:name">
              <Result />
            </Route>
            <Route path="/">
              <Measure />
            </Route>
          </Switch>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
