import React from 'react';
import moment from 'moment';

export default class TestResultsTooltip extends React.Component {
  render() {
    const { active, payload, label } = this.props;
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#212529', border: '1px solid #454c54', padding: '10px' }}>
          <p className="label">{`${moment(label).format('DD MMM YYYY')}`}</p>
            <hr/>
            {payload.map((item, index) => (
                <div key={index}>
                    <p className="label" style={{color: item.color}}>{`${item.name}: ${item.value} ${item.unit}`}</p>
                </div>
            ))}
        </div>
      );
    }

    return null;
  }
}
