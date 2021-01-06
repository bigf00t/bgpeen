import React, { Component } from 'react';
import { Bar, Line } from 'react-chartjs-2';

const options = {
  scales: {
    yAxes: [
      {
        stacked: true,
        ticks: {
          beginAtZero: true,
        },
      },
    ],
    xAxes: [
      {
        stacked: true,
      },
    ],
  }
}

class VerticalBar extends Component {
    render () {
        if (this.props.data != null) {
            return (
                <Bar data={this.props.data} options={options} />
            );
        } else {
            return "";
        }
    }
}

export default (VerticalBar);