import Styled, { ExecutionContext } from 'styled-components';
import { PageHeader } from "@ant-design/pro-components";
import { getThemeModeColors } from "../../config/theme/themeVariables";

const PageHeaderStyle = Styled(PageHeader)`
  .ant-page-header .ant-page-header-heading-extra {
    margin-block: 4px;
  }

  &.ant-page-header {
    padding: 16px 24px 25px;
    background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).mainBackgroundLight};
    &.ninjadash-page-header-main{
      background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).mainBackground};
    }
    &.ant-page-header-ghost{
      padding: 18px 24px 18px;
    }
  }
  
  &.ant-page-header.has-breadcrumb{
    padding-top: 15px;
    .ant-breadcrumb{
      ol li{
        display: flex;
        .ant-breadcrumb-link{
          display: flex;
          transition: color 0.3s;
          div{
            line-height: 1;
            svg{
              position: relative;
              top: 2px;
              margin-right: 8px;
              path{
                transition: color 0.3s;
              }
            }
          }
          &:hover{
            div{
              svg path{
                fill: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
              }
            }
          }
        }
        .ant-breadcrumb-separator{
          display: flex;
          align-items: center;
          .ninjadash-seperator{
            display: block;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).extraLight};
          }
        }
        &:last-child{
          .ant-breadcrumb-separator{
            display: none;
          }
        }
      }
    }
  }
  
  .page-header-actions button.ant-btn-primary svg {
    color: #fff;
  }
  .page-header-actions button.ant-btn-white svg {
    width: 12px;
    height: 12px;
    margin-left: 2px;
    color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).menuActive};
    position: relative;
    top: -1px;
  }
  i +span, svg +span, img +span {
    margin-left: 6px;
  }
  .ant-breadcrumb ol{
    @media only screen and (max-width: 767px){
      justify-content: center;
    }
  }
  
  /* Main Page Header Style */
  &.ninjadash-page-header-main{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 34px 30px 24px;
    @media only screen and (max-width: 991px){
      padding: 18px 15px 12px;
    }
    @media only screen and (max-width: 767px){
      flex-direction: column;
      align-items: center;
      padding: 20px 15px 30px;
    }
    .ant-page-header-heading-title{
      @media only screen and (max-width: 767px){
        margin-right: 0;
        margin-left: 0;
      }
    }
    .ant-page-header-heading-sub-title{
      padding-bottom: 2px;
    }
    .ant-breadcrumb{
      order: 2;
      position: relative;
      top: 10px;
      >span{
        position: relative;
        padding-right: 10px;
        color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText};
        &:first-child{
          padding-right: 20px;
          .ant-breadcrumb-link{
            &:hover{
              &:before{
                color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
              }
              a{
                color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
              }
            }
            a{
              color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText};
            }
            &:before{
              position: absolute;
              left: 0;
              top: 0;
              line-height: 1.45;
              font-family: 'FontAwesome';
              font-weight: 900;
              content: "\\f015";
              color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText};
              visibility: visible;
            }
            &:after{
              display: none;
            }
          }
        }

        &:last-child{
          .ant-breadcrumb-link{
            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).lightText};
            &:hover{
              &:after{
                background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).lightText};
              }
            }
          }
        }

        .ant-breadcrumb-link{
          &:after{
            position: absolute;
            left: 0;
            padding-left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 4px;
            content: '';
            background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).lightText};
            border-radius: 50%;
          }
        }

        .ant-breadcrumb-separator{
          display: none;
        }
      }
      span + span{
        margin-left: 8px;
      }
      .ant-breadcrumb-link{
        &:hover{
          &:after{
            background-color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
          }
          a{
              color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
          }
        }
        a,
        span{
          font-size: 14px;
          color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayLightText};
        }
      }
      &+.ant-page-header-heading {
        margin-top: 4px;
        margin-bottom: 4px;
        @media only screen and (max-width: 767px){
          margin-bottom: 0;
        }
      }
    }
    .ant-page-header-heading{
      margin: 4px  0;
      flex: 1;
      .ant-page-header-heading-left{
        margin: 0;
      }
      .ant-page-header-heading-title{
        font-size: 22px;
        font-weight: 600;
        color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
        h1,
        h2,
        h3,
        h4,
        h5,
        h6{
          font-weight: 600;
          margin-bottom: 0;
          color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
        }
      }
    }
  }
  &.ninjadash-pageheader-with-back{
    &.ninjadash-page-header-main{
      padding: 32px 30px 25px;
    }
    .ant-page-header-heading-title{
      .back-link{
        display: inline-block;
        margin-top: 10px;
        font-size: 14px;
        font-weight: 500;
        a{
          color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText};
          display: flex;
          align-items: center;
          &:hover{
            color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
          }
        }
      }
    }
  }
`;

// background: {({ theme, bgColor }) => bgColor || theme[theme.mainContent]['mainBackgroundLight}};
const HeaderWrapper = Styled.div`
  background: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).mainBackgroundLight};
  border-radius: 5px;
  .ant-page-header-heading-title{
    color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
  }
  .ant-page-header-heading-sub-title{
    color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText};
  }
`;

export { PageHeaderStyle, HeaderWrapper };
