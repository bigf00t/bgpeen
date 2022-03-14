import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';
import { StyledEngineProvider } from '@mui/styled-engine';
import CssBaseline from '@mui/material/CssBaseline';
// import './App.css';

import Menu from './components/Menu';
import Measure from './components/Measure';
import Result from './components/Result';

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          background: {
            default: '#303030',
            paper: '#303030',
          },
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
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div className="App">
            <Menu />
            <Routes>
              <Route path="/:id/:name" element={<Result />}>
                <Route path=":score/:players/:place" element={<Result />} />
              </Route>
              <Route path="/" element={<Measure />} />
            </Routes>
          </div>
        </ThemeProvider>
      </StyledEngineProvider>
    </BrowserRouter>
  );
}

export default App;
