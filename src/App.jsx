import React from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';
import { StyledEngineProvider } from '@mui/styled-engine';
import CssBaseline from '@mui/material/CssBaseline';

import Menu from './components/Menu';
import Measure from './components/Measure';
import Result from './components/Result';
const ResultV2 = React.lazy(() => import('./components/ResultV2'));

function AppRoutes() {
  const [searchParams] = useSearchParams();
  const isV2 = searchParams.get('v2') === '1';
  return (
    <Routes>
      <Route
        path="/:id/:name/*"
        element={
          isV2
            ? <React.Suspense fallback={null}><ResultV2 /></React.Suspense>
            : <Result />
        }
      />
      <Route path="/" element={<Measure />} />
      <Route path="/dev" element={<Measure />} />
    </Routes>
  );
}

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          background: { default: '#2a2d35', paper: '#1e2028' },
          graph: {
            background: { light: 'rgba(63, 81, 181, 0.25)', dark: 'rgba(255, 205, 86, 0.25)' },
            border: { light: 'rgba(63, 81, 181, 0.5)', dark: 'rgba(255, 205, 86, 0.5)' },
            point: { light: 'rgba(63, 81, 181, 1)', dark: 'rgba(255, 205, 86, 1)' },
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
            <AppRoutes />
          </div>
        </ThemeProvider>
      </StyledEngineProvider>
    </BrowserRouter>
  );
}

export default App;
