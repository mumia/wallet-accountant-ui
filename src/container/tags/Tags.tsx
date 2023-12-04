import { CardToolbox, Main } from "../../container/styled";
import { PageHeader } from "../../components/page-headers/page-headers";
import React, { useState } from "react";
import { Button, Card, Col, Row, Tag as AntTag } from "antd";
import { UilPlus } from "@iconscout/react-unicons";
import TagApi, { Tag, TagCategory } from "../../api/TagApi";
import { useLoaderData, useNavigate } from "react-router-dom";
import NewTagCategory from "../../container/tags/NewTagCategory";
import useWebSocket from "react-use-websocket";
import { WebSocketRunnerHelper, WS_URL } from "../../layout/WebSocketRunner";
import NewTag from "../../container/tags/NewTag";

const api = new TagApi();

export async function loader() {
  return api.tags();
}

function getTagCategory(
  tagCategories: TagCategory[],
  showTagModal: (tagCategoryId: string) => void
) {
  if (tagCategories.length === 0) {
    return <div>No tags registered</div>;
  }

  let count = 0;
  let column1: TagCategory[] = [];
  let column2: TagCategory[] = [];
  let column3: TagCategory[] = [];
  tagCategories.forEach(tagCategory => {
    switch (count % 3) {
      case 0:
        column1.push(tagCategory);
        break;

      case 1:
        column2.push(tagCategory);
        break;

      case 2:
        column3.push(tagCategory);
        break;
    }

    count++
  });

  return (
    <Row gutter={[8, 8]}>
      <Col span={8}>{getTagCategories(column1, showTagModal)}</Col>
      <Col span={8}>{getTagCategories(column2, showTagModal)}</Col>
      <Col span={8}>{getTagCategories(column3, showTagModal)}</Col>
    </Row>
  );
}

function getTagCategories(
  tagCategories: TagCategory[],
  showTagModal: (tagCategoryId: string) => void
) {
  return tagCategories.map(tagCategory =>
    <Card
      title={tagCategory.name}
      about={tagCategory.notes}
      extra={
        <Button
          onClick={() => showTagModal(tagCategory.tagCategoryId)}
          type="primary"
          size="middle"
          className="btn-add_new"
        >
          Add tag
        </Button>
      }
    >
      {getTags(tagCategory.tags)}
    </Card>
  );
}

function getTags(tags: Tag[]) {
  return tags.map(tag => <AntTag color="geekblue">{tag.name}</AntTag>);
}

const Tags = (): React.JSX.Element => {
  const tagCategories = useLoaderData() as TagCategory[];
  const [newCategoryVisible, setNewCategoryVisible] = useState(false);
  const [newTagVisible, setNewTagVisible] = useState("");
  const navigate = useNavigate();

  const showCategoryModal = () => setNewCategoryVisible(true);
  const hideCategoryModal = () => setNewCategoryVisible(false);

  const showTagModal = (tagCategoryId: string) => setNewTagVisible(tagCategoryId);
  const hideTagModal = () => setNewTagVisible("");

  const refresh = () => navigate(".");

  // TODO: web socket is not working as expected
  useWebSocket(
    WS_URL,
    WebSocketRunnerHelper("tagCategory", refresh),
  );

  return (
    <>
      <CardToolbox>
        <PageHeader
          className="ninjadash-page-header-main"
          ghost
          title="Tags"
          subTitle={<>{tagCategories.length} tag categories</>}
          buttons={[
            <Button key="1" onClick={showCategoryModal} type="primary" size="middle" className="btn-add_new">
              <UilPlus /> Add new category
            </Button>
          ]}
        />
      </CardToolbox>
      <Main>
        {getTagCategory(tagCategories, showTagModal)}
        <NewTagCategory onClose={hideCategoryModal} visible={newCategoryVisible} />
        {tagCategories.map(tagCategory =>
          <NewTag
            onClose={hideTagModal}
            visible={newTagVisible === tagCategory.tagCategoryId}
            tagCategoryId={tagCategory.tagCategoryId}
            tagCategoryName={tagCategory.name}
          />
        )}
      </Main>
    </>
  );
};

export default Tags;
