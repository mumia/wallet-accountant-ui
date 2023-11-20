import React from "react";
import { Col, Row } from "antd";
import { CardToolbox, Main } from "../styled";
import { PageHeader } from "../../components/page-headers/page-headers";
import { Cards } from "../../components/cards/frame/cards-frame";

export default function Dashboard() {
  return (
    <>
      <CardToolbox>
        <PageHeader className="ninjadash-page-header-main" title="Dashboard" />
      </CardToolbox>
      <Main>
        <Row gutter={25}>
          <Col sm={24} xs={24}>
            <Cards headless>
              <h3>
                Dashboard
              </h3>
            </Cards>
          </Col>
        </Row>
      </Main>
    </>
  );
}
