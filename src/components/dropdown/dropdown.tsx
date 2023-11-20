import PropTypes, { InferProps } from "prop-types";
import React from 'react';
import { Link } from 'react-router-dom';
import { Content, DropdownStyle } from './dropdown-style';

function Dropdown(props: InferProps<typeof Dropdown.propTypes>) {
  const { content, placement, title, action, children, style, className } = props;

  return (
    <DropdownStyle
      overlayClassName={className}
      style={style}
      placement={placement}
      title={title}
      overlay={<Content>{content}</Content>}
      trigger={action}
    >
      {children}
    </DropdownStyle>
  );
}

const content = (
  <>
    <Link to="#">
      <span>Export to CSV</span>
    </Link>
    <Link to="#">
      <span>Export to XML</span>
    </Link>
    <Link to="#">
      <span>Export to Drive</span>
    </Link>
  </>
);

Dropdown.defaultProps = {
  action: ['hover'],
  placement: 'bottomRight',
  content,
  style: {},
  className: 'ninjadash-dropdown',
};

Dropdown.propTypes = {
  placement: PropTypes.string,
  title: PropTypes.string,
  action: PropTypes.array,
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.node]),
  children: PropTypes.node,
  style: PropTypes.object,
  className: PropTypes.string,
};

export { Dropdown };
