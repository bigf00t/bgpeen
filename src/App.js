import React from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import './App.css';

import Menu from './components/Menu';
import MeasureForm from './components/MeasureForm';

function App() {
  return (
    <React.Fragment>
      <CssBaseline />
      <div className="App">
        <Menu />
        <MeasureForm />
      </div>
    </React.Fragment>
  );
}

export default App;