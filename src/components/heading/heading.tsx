import PropTypes, { InferProps } from "prop-types";
import React from "react";
import * as headings from "./style";

function Heading(props: InferProps<typeof Heading.propTypes>) {
  const { as, children, className, id } = props;
  let StyledHeading = headings.H1;
  switch (as) {
    case "h2":
      StyledHeading = headings.H2;
      break;

    case "h3":
      StyledHeading = headings.H3;
      break;

    case "h4":
      StyledHeading = headings.H4;
      break;

    case "h5":
      StyledHeading = headings.H5;
      break;

    case "h6":
      StyledHeading = headings.H6;
      break;

    default:
      StyledHeading = headings.H1;
  }

  return (
    <StyledHeading className={className} id={id}>
      {children}
    </StyledHeading>
  );
}

Heading.defaultProps = {
  as: "h1"
};

Heading.propTypes = {
  as: PropTypes.oneOf(["h1", "h2", "h3", "h4", "h5", "h6"]),
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.node]),
  className: PropTypes.string,
  id: PropTypes.string
};

export default Heading;
