import React from 'react';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import './App.css';

import Menu from './components/Menu';
import MeasureForm from './components/MeasureForm';

function App() {
  document.title = window.location.toString().includes('bgpeen') ? "bgpeen - measure your scores" : "amigoodat.games - well are you?";
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? 'dark' : 'light',
          graph: {
              background: {
                light: 'rgba(63, 81, 181, 0.25)',
                dark: 'rgba(255, 205, 86, 0.25)'
              },
              border: {
                light: 'rgba(63, 81, 181, 0.5)',
                dark: 'rgba(255, 205, 86, 0.5)'
              },
              point: {
                light: 'rgba(63, 81, 181, 1)',
                dark: 'rgba(255, 205, 86, 1)'
              },
          },
        },
      }),
    [prefersDarkMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <Menu />
        <MeasureForm />
      </div>
    </ThemeProvider>
  );
}

export default App;