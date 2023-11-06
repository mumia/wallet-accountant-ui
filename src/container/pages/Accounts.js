import React from 'react';
import { Col, Row } from 'antd';
import { PageHeader } from '../../components/page-headers/page-headers';
import { Main } from '../styled';
import { Cards } from '../../components/cards/frame/cards-frame';

export async function loader() {
  const response = await fetch('http://localhost:8080/accounts', { mode: 'cors' });

  return response.json();
}

function Accounts() {
  const PageRoutes = [
    {
      path: 'index',
      breadcrumbName: 'Dashboard',
    },
  ];

  return (
    <>
      <PageHeader className="ninjadash-page-header-main" title="Accounts" routes={PageRoutes} />
      <Main>
        <Row gutter={25}>
          <Col sm={24} xs={24}>
            <Cards headless>
              <h3>Accounts</h3>
            </Cards>
          </Col>
        </Row>
      </Main>
    </>
  );
}

export default Accounts;
