import React, { useState, useEffect } from 'react';
import annotationPlugin from 'chartjs-plugin-annotation';
import withTheme from '@mui/styles/withTheme';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Filler,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
} from 'chart.js';

ChartJS.register(
  LineController,
  LineElement,
  Filler,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  annotationPlugin
);

const Graph = (props) => {
  const [graphData, setGraphData] = useState({ datasets: [] });

  const getScoreColor = (percentile) => {
    return percentile < 40 ? '#e57373' : percentile > 60 ? '#66bb6a' : 'rgba(255, 255, 255, 0.7)';
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: props.theme.palette.text.secondary,
        },
        grid: {
          color: props.theme.palette.divider,
        },
      },
      x: {
        type: 'linear',
        position: 'bottom',
        grid: {
          color: props.theme.palette.divider,
        },
        ticks: {
          color: props.theme.palette.text.secondary,
        },
      },
    },
    plugins: {
      annotation: {
        animation: false,
        annotations: {
          line1: {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x',
            value: props.result.mean,
            borderColor: props.theme.palette.text.secondary,
            borderDash: [5],
            borderWidth: 2,
          },
          line2: {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x',
            value: props.score === '' ? null : props.score,
            borderColor: getScoreColor(props.percentile),
            borderWidth: 4,
          },
        },
      },
    },
  };

  const updateGraphData = () => {
    const graphPoints = _.chain(props.result.scores)
      .reduce((points, count, score) => {
        return points.concat([{ x: parseInt(score), y: count }]);
      }, [])
      .orderBy(['x'])
      .value();

    const newGraphData = {
      datasets: [
        {
          data: graphPoints,
          label: ['Scores'],
          backgroundColor: props.theme.palette.graph.background[props.theme.palette.mode],
          borderColor: props.theme.palette.graph.border[props.theme.palette.mode],
          pointBackgroundColor: props.theme.palette.graph.point[props.theme.palette.mode],
          fill: true,
          spanGaps: true,
          lineTension: 0,
        },
      ],
    };

    setGraphData(newGraphData);
  };

  // componentDidUpdate result, score
  useEffect(() => {
    if (!_.isEmpty(props.result)) {
      updateGraphData();
    }
  }, [props.result]);

  return <Chart type="line" data={graphData} options={options} />;
};

Graph.propTypes = {
  result: PropTypes.object,
  score: PropTypes.any,
  percentile: PropTypes.number,
  theme: PropTypes.any,
};

export default withTheme(Graph);
