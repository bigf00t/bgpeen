import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import * as ChartAnnotation from 'chartjs-plugin-annotation';
import { withTheme } from '@material-ui/core/styles';
import ordinal from 'ordinal';
import PropTypes from 'prop-types';
import _ from 'lodash';

const getScoreColor = (percentile) => {
  return percentile < 50 ? '#e57373' : '#66bb6a';
};

const getOptions = (props) => {
  return {
    legend: {
      labels: {
        fontColor: props.theme.palette.text.secondary,
      },
    },
    scales: {
      yAxes: [
        {
          scaleLabel: {
            display: true,
            labelString: 'Valid Scores',
            fontColor: props.theme.palette.text.secondary,
          },
          ticks: {
            beginAtZero: true,
            fontColor: props.theme.palette.text.secondary,
          },
          gridLines: {
            color: props.theme.palette.divider,
            zeroLineColor: props.theme.palette.text.secondary,
          },
        },
      ],
      xAxes: [
        {
          scaleLabel: {
            display: true,
            labelString: 'Score',
            fontColor: props.theme.palette.text.secondary,
          },
          type: 'linear',
          position: 'bottom',
          gridLines: {
            color: props.theme.palette.divider,
            zeroLineColor: props.theme.palette.text.secondary,
          },
          ticks: {
            fontColor: props.theme.palette.text.secondary,
          },
        },
      ],
    },
    annotation: {
      annotations: [
        {
          type: 'line',
          mode: 'vertical',
          scaleID: 'x-axis-0',
          value: props.result.mean,
          borderColor: props.theme.palette.text.secondary,
          borderWidth: 2,
          label: {
            content: `Mean: ${props.result.mean}`,
            enabled: true,
            fontColor: props.theme.palette.background.default,
            backgroundColor: props.theme.palette.text.secondary,
            position: 'bottom',
            xPadding: 10,
            yPadding: 6,
            // yAdjust: 0,
          },
        },
        {
          type: 'line',
          mode: 'vertical',
          scaleID: 'x-axis-0',
          value: props.score,
          borderColor: getScoreColor(props.percentile),
          borderWidth: 2,
          label: {
            // TODO: Make this multiline when v1.0 of annotation plugin is released
            content: [
              `Your score: ${props.score} - ${ordinal(
                props.percentile || 0
              )} percentile`,
            ],
            enabled: true,
            fontColor: props.theme.palette.background.default,
            backgroundColor: getScoreColor(props.percentile),
            position: 'top',
            xPadding: 10,
            yPadding: 6,
          },
        },
      ],
    },
  };
};

class Graph extends Component {
  constructor(props) {
    super(props);
    this.state = {
      graphData: {},
    };
  }

  setGraphData = () => {
    if (!this.props.result) {
      return;
    }

    var graphPoints = _.chain(this.props.result.scores)
      .reduce((points, count, score) => {
        return points.concat([{ x: parseInt(score), y: count }]);
      }, [])
      .orderBy(['x'])
      .value();

    var graphData = {
      datasets: [
        {
          data: graphPoints,
          label: ['Scores'],
          // color: 'rgba(63, 81, 181, 1)',
          // backgroundColor: 'rgba(63, 81, 181, 0.25)',
          backgroundColor: this.props.theme.palette.graph.background[
            this.props.theme.palette.type
          ],
          borderColor: this.props.theme.palette.graph.border[
            this.props.theme.palette.type
          ],
          pointBackgroundColor: this.props.theme.palette.graph.point[
            this.props.theme.palette.type
          ],
          // borderColor: 'rgba(63, 81, 181, 0.5)',
          // pointBackgroundColor: 'rgba(63, 81, 181, 1)',
          // borderWidth: 1,
          fill: true,
          // showLine: false,
          // lineWidth: 0.5,
          spanGaps: true,
          lineTension: 0,
          // cubicInterpolationMode: 'monotone',
          // steppedLine: true,
          // trendlineLinear: {
          //     style: "rgba(255,105,180, .8)",
          //     lineStyle: "solid",
          //     width: 2
          // }
        },
      ],
    };

    // return graphData;
    this.setState({ graphData: graphData });
  };

  componentDidUpdate(prevProps) {
    if (
      this.props.result !== prevProps.result ||
      this.props.score !== prevProps.score
    ) {
      this.setGraphData();
    }
  }

  render() {
    if (this.props.result) {
      return (
        <Line
          data={this.state.graphData}
          options={getOptions(this.props)}
          plugins={[ChartAnnotation]}
        />
      );
    } else {
      return '';
    }
  }
}

Graph.propTypes = {
  result: PropTypes.object,
  score: PropTypes.string,
  percentile: PropTypes.number,
  theme: PropTypes.any,
};

export default withTheme(Graph);
