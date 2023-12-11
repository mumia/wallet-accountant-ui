import React from "react";
import { CardToolbox, Main } from "../../container/styled";
import { PageHeader } from "../../components/page-headers/page-headers";
import { Cards } from "../../components/cards/frame/cards-frame";

export default function Movements() {
  return (
    <>
      <CardToolbox>
        <PageHeader
          className="ninjadash-page-header-main"
          ghost
          title="Movements"
        />
      </CardToolbox>
      <Main>
        <Cards headless>
          Movement
        </Cards>
      </Main>
    </>
  );
}
