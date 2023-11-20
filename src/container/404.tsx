import React, { useState, useEffect } from 'react';
import { Button, Spin } from "antd";
import { NavLink } from 'react-router-dom';
import { Main, ErrorWrapper } from './styled';
import Heading from '../components/heading/heading';
import notFound from '../static/img/pages/404.svg';
// import { Button } from '../../components/buttons/buttons';

function NotFound() {
  const [state, setState] = useState({
    isLoading: true,
  });

  useEffect(() => {
    setTimeout(() => {
      setState({ isLoading: false });
    }, 1500);
  }, []);

  return (
    <Main>
      {state.isLoading ? (
        <div className="spin">
          <Spin />
        </div>
      ) : (
        <ErrorWrapper>
          <img src={notFound} alt="404" />
          <Heading className="error-text" as="h3">
            404
          </Heading>
          <p>Sorry! the page you are looking for doesn't exist.</p>
          <NavLink to="/admin">
            <Button size="large" type="primary">
              Return Home
            </Button>
          </NavLink>
        </ErrorWrapper>
      )}
    </Main>
  );
}
export default NotFound;
