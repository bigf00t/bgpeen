import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';
import { StyledEngineProvider } from '@mui/styled-engine';
import CssBaseline from '@mui/material/CssBaseline';

import Menu from './components/Menu';
import Measure from './components/Measure';
import Result from './components/Result';
// import Maintenance from './components/Maintenance';

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          background: {
            default: '#303030',
            paper: '#282828',
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
                <Route path="score/:score" element={<Result />} />
                <Route path="players/:players" element={<Result />}>
                  <Route path="score/:score" element={<Result />} />
                  <Route path="start/:start" element={<Result />}>
                    <Route path="score/:score" element={<Result />} />
                  </Route>
                  <Route path="finish/:finish" element={<Result />}>
                    <Route path="score/:score" element={<Result />} />
                  </Route>
                </Route>
                <Route path="color/:color" element={<Result />}>
                  <Route path="score/:score" element={<Result />} />
                </Route>
                <Route path="year/:year" element={<Result />}>
                  <Route path="score/:score" element={<Result />} />
                  <Route path="month/:month" element={<Result />}>
                    <Route path="score/:score" element={<Result />} />
                  </Route>
                </Route>
              </Route>
              {/* <Route path="/" element={<Maintenance />} /> */}
              <Route path="/" element={<Measure />} />
              <Route path="/dev" element={<Measure />} />
            </Routes>
          </div>
        </ThemeProvider>
      </StyledEngineProvider>
    </BrowserRouter>
  );
}

export default App;
