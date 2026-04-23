import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';
import { StyledEngineProvider } from '@mui/styled-engine';
import CssBaseline from '@mui/material/CssBaseline';

import Menu from './components/Menu';
import Measure from './components/Measure';
const ResultV2 = React.lazy(() => import('./components/ResultV2'));

function App() {
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          background: { default: '#2a2d35', paper: '#1e2028' },
          graph: {
            background: { light: 'rgba(63, 81, 181, 0.25)', dark: 'rgba(255, 205, 86, 0.25)' },
            border: { light: 'rgba(63, 81, 181, 0.5)', dark: 'rgba(255, 205, 86, 0.5)' },
            point: { light: 'rgba(63, 81, 181, 1)', dark: 'rgba(255, 205, 86, 1)' },
          },
        },
      }),
    []
  );

  return (
    <BrowserRouter>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div className="App">
            <Menu />
            <Routes>
              <Route
                path="/:id/:name"
                element={<React.Suspense fallback={null}><ResultV2 /></React.Suspense>}
              />
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
