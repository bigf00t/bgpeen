import React from 'react';
import ScoreCounter from './ScoreCounter';
import SelectGame from './SelectGame';
import TopGames from './TopGames';
import Box from '@mui/material/Box';

const Measure = () => {
  document.title = 'Good at Games';

  return (
    <Box component="div" pt={'64px'} height={'100vh'}>
      <Box component="div" p={4}>
        <SelectGame />
      </Box>
      <ScoreCounter />
      <Box component="div" p={4} pb={0}>
        <TopGames title="Most Popular Games" field="popularity" />
      </Box>
      <Box component="div" p={4}>
        <TopGames title="Recently Added Games" field="addedDate" />
      </Box>
    </Box>
  );
};

export default Measure;
