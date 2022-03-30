import React from 'react';
import annotationPlugin from 'chartjs-plugin-annotation';
import withTheme from '@mui/styles/withTheme';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Filler,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  LineElement,
  Filler,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

const Graph = (props) => {
  const getScoreColor = (percentile) => {
    return percentile < 40 ? '#e57373' : percentile > 60 ? '#66bb6a' : 'rgba(255, 255, 255, 0.7)';
  };

  const options = {
    responsive: true,
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
      tooltip: {
        usePointStyle: true,
        callbacks: {
          title: () => '',
          label: (context) => ` Score: ${context.parsed.x} - Count: ${context.parsed.y}`,
        },
      },
      legend: {
        display: false,
        labels: {
          color: props.theme.palette.text.primary,
          font: {
            size: 16,
          },
        },
      },
    },
  };

  const getDataFromResult = () =>
    _.chain(props.result.scores)
      .reduce((points, count, score) => points.concat([{ x: parseInt(score), y: count }]), [])
      .orderBy(['x'])
      .value();

  const labels = getDataFromResult().map((item) => item.x, []);

  const getLabelText = () =>
    `${!props.result.playerCount ? 'All' : 'Filtered'} Scores - Total ${props.result.scoreCount} - Avg ${
      props.result.mean
    }`;

  const data = {
    labels,
    datasets: [
      {
        // label: getLabelText(),
        data: getDataFromResult().map((item) => item.y, []),
        backgroundColor: props.theme.palette.graph.background[props.theme.palette.mode],
        borderColor: props.theme.palette.graph.border[props.theme.palette.mode],
        pointBackgroundColor: props.theme.palette.graph.point[props.theme.palette.mode],
        fill: true,
        spanGaps: true,
        lineTension: 0,
      },
    ],
  };

  return <Line data={data} options={options} />;
};

Graph.propTypes = {
  label: PropTypes.string,
  result: PropTypes.object,
  score: PropTypes.any,
  percentile: PropTypes.number,
  theme: PropTypes.any,
};

export default withTheme(Graph);
