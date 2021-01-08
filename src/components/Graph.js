import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import * as ChartAnnotation from 'chartjs-plugin-annotation'

var getScoreColor = (percentile) => {
  return percentile < 50 ? 'red': 'green';
}

var getOptions = (score, percentile) => {
  return {
    scales: {    
      yAxes: [{
        ticks: {
          beginAtZero: true,
        }
      }],
      xAxes: [{
          type: 'linear',
          position: 'bottom'
      }]
    },
    annotation: {
      annotations: [
        {
          type: 'line',
          mode: 'vertical',
          scaleID: 'x-axis-0',
          value: score,
          borderColor: getScoreColor(percentile),
          borderWidth: 2,
          label: {
            content: `Your score: ${score}`,
            enabled: true,
            backgroundColor: getScoreColor(percentile),
            position: 'top',
            xPadding: 10,
            yPadding: 6,
            // yAdjust: 5,
          },
        },
      ],
    }
  }
}

class Graph extends Component {
  render () {

    if (this.props.data != null) {
        return (
            <Line data={this.props.data} options={getOptions(this.props.score, this.props.percentile)} plugins={[ChartAnnotation]} />
        );
    } else {
        return "";
    }
  }
}

export default (Graph);