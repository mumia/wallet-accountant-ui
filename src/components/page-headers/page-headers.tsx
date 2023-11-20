// import { Breadcrumb } from 'antd';
import PropTypes, { InferProps } from "prop-types";
// import { Link } from 'react-router-dom';
// import { ReactSVG } from 'react-svg';
import { HeaderWrapper, PageHeaderStyle } from './style';
import React from "react";

function PageHeader(props: InferProps<typeof PageHeader.propTypes>) {
  // const breadcrumb = routes ? (
  //   <Breadcrumb separator={<span className="ninjadash-seperator" />}>
  //     {routes.map((route, index) =>
  //       index + 1 === routes.length ? (
  //         <Breadcrumb.Item key={index}>{route.breadcrumbName}</Breadcrumb.Item>
  //       ) : (
  //         <Breadcrumb.Item key={index}>
  //           <ReactSVG src={require(`../../static/img/icon/home.svg`).default} />{' '}
  //           <Link to={route.path}>{route.breadcrumbName}</Link>
  //         </Breadcrumb.Item>
  //       ),
  //     )}
  //   </Breadcrumb>
  // ) : (
  //   ''
  // );
  return (
    <HeaderWrapper bgColor={props.bgColor}>
      <PageHeaderStyle
        className={props.className}
        title={props.title}
        subTitle={props.subTitle}
        // breadcrumb={breadcrumb}
        extra={props.buttons}
        ghost={props.ghost}
      />
    </HeaderWrapper>
  );
}

PageHeader.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  subTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  bgColor: PropTypes.string,
  className: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object),
  buttons: PropTypes.array,
  ghost: PropTypes.bool,
};

export { PageHeader };
