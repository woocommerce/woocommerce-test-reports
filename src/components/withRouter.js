import React from 'react';
import {useLocation, useParams} from 'react-router-dom';

const withRouter = WrappedComponent => props => {
  const params = useParams();
  const location = useLocation();

  return (
    <WrappedComponent
      {...props}
      params={params}
      location={location}
    />
  );
};

export default withRouter;
