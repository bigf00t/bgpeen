import React from 'react';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useTheme } from '@mui/material/styles';
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
  const theme = useTheme();

  const getScoreColor = (percentile) => {
    return percentile < 40 ? '#e57373' : percentile > 60 ? '#66bb6a' : 'rgba(255, 255, 255, 0.7)';
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: theme.palette.text.secondary,
        },
        grid: {
          color: theme.palette.divider,
        },
      },
      x: {
        type: 'linear',
        position: 'bottom',
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
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
            borderColor: theme.palette.text.secondary,
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
          color: theme.palette.text.primary,
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

  const chartData = getDataFromResult();
  const labels = chartData.map((item) => item.x);

  const data = {
    labels,
    datasets: [
      {
        // label: getLabelText(),
        data: chartData.map((item) => item.y),
        backgroundColor: theme.palette.graph.background[theme.palette.mode],
        borderColor: theme.palette.graph.border[theme.palette.mode],
        pointBackgroundColor: theme.palette.graph.point[theme.palette.mode],
        fill: true,
        spanGaps: true,
        tension: 0,
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
};

export default Graph;
