import React from "react";
import { CardToolbox, Main } from "../../container/styled";
import { PageHeader } from "../../components/page-headers/page-headers";
import AccountApi, { Account } from "../../api/AccountApi";
import { Button, Card, Col, Row } from "antd";
import { useLoaderData, useNavigate } from "react-router-dom";

const accountApi = new AccountApi();

export async function loader() {
  return accountApi.accounts();
}

export default function AccountOverview() {
  const navigate = useNavigate();
  const accounts = useLoaderData() as Account[];

  return (
    <>
      <CardToolbox>
        <PageHeader
          className="ninjadash-page-header-main"
          ghost
          title="Movements - Accounts Overview"
        />
      </CardToolbox>
      <Main>
        <Row gutter={[12, 12]}>
          {accounts.map(account => (
            <Col span={8}>
              <Card
                title={account.name}
                extra={<Button type={"primary"} onClick={() => navigate(account.accountId)}>Manage</Button>}
              >
                <ul>
                  <li>Current balance: 1000 EUR</li>
                  <li>Confirmed movements: 10</li>
                  <li>Pending movements: 15</li>
                </ul>
              </Card>
            </Col>
          ))}

        </Row>
      </Main>
    </>
  );
}
