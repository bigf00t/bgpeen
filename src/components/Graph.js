import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import * as ChartAnnotation from 'chartjs-plugin-annotation'
import { withTheme  } from '@material-ui/core/styles';
import ordinal from 'ordinal';

var getScoreColor = (percentile) => {
  return percentile < 50 ? '#e57373': '#66bb6a';
}

var getStdLine = (props, dev) => {
  var stdVal = props.mean + (props.std * dev);
  return {
    type: 'line',
    mode: 'vertical',
    scaleID: 'x-axis-0',
    value: stdVal,
    borderColor: props.theme.palette.text.secondary,
    borderWidth: 1,
    label: {
      content: `${dev} std: ${stdVal}`,
      enabled: true,
      fontColor: props.theme.palette.background.default,
      backgroundColor: props.theme.palette.text.secondary,
      position: 'bottom',
      xPadding: 10,
      yPadding: 6,
      // yAdjust: 0,
    },
  };
}

var getOptions = (props) => {
  var stdLines = [
    getStdLine(props, -2),
    getStdLine(props, -1),
    getStdLine(props, 1),
    getStdLine(props, 2),
  ];

  return {
    legend: {
      labels: {
        fontColor: props.theme.palette.text.secondary
      }
    },
    scales: {
      yAxes: [{
        scaleLabel: {
          display: true,
          labelString: 'Valid Scores',
          fontColor: props.theme.palette.text.secondary
        },
        ticks: {
          beginAtZero: true,
          fontColor: props.theme.palette.text.secondary
        },
        gridLines: {
          color: props.theme.palette.divider,
          zeroLineColor: props.theme.palette.text.secondary
        }
      }],
      xAxes: [{
        scaleLabel: {
          display: true,
          labelString: 'Score',
          fontColor: props.theme.palette.text.secondary
        },
        type: 'linear',
        position: 'bottom',
        gridLines: {
          color: props.theme.palette.divider,
          zeroLineColor: props.theme.palette.text.secondary
        },
        ticks: {
          fontColor: props.theme.palette.text.secondary
        },
      }]
    },
    annotation: {
      annotations: [
        //...stdLines,
        {
          type: 'line',
          mode: 'vertical',
          scaleID: 'x-axis-0',
          value: props.mean,
          borderColor: props.theme.palette.text.secondary,
          borderWidth: 2,
          label: {
            content: `Mean: ${props.mean}`,
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
            content: [`Your score: ${props.score} - ${ordinal(props.percentile || 0)} percentile`],
            enabled: true,
            fontColor: props.theme.palette.background.default,
            backgroundColor: getScoreColor(props.percentile),
            position: 'top',
            xPadding: 10,
            yPadding: 6,
          },
        },
      ],
    }
  }
}

class Graph extends Component {
  render () {

    if (this.props.data != null) {
        // TODO: Won't work with multiple datasets, clearly
        this.props.data.datasets[0].backgroundColor = this.props.theme.palette.graph.background[this.props.theme.palette.type];
        this.props.data.datasets[0].borderColor = this.props.theme.palette.graph.border[this.props.theme.palette.type];
        this.props.data.datasets[0].pointBackgroundColor = this.props.theme.palette.graph.point[this.props.theme.palette.type];

        return (
            <Line data={this.props.data} options={getOptions(this.props)} plugins={[ChartAnnotation]} />
        );
    } else {
        return "";
    }
  }
}

export default withTheme(Graph);