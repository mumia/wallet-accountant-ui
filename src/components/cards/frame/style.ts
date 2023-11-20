import { Card } from 'antd';
import Styled, { ExecutionContext } from 'styled-components';
import { getThemeModeColors, UiTheme } from '../../../config/theme/themeVariables';

const BtnWraper = (theme: UiTheme) => `
    .ant-card-head {
      display: flex;
      justify-content: space-evenly;
      .ant-card-head-wrapper{
        width: 100%;
      }
      .ant-tabs.ant-tabs-top.ant-card-head-tabs.ant-tabs-large.ant-tabs-line{
        width: 100%;
        display: block;
      }
      .ant-tabs-nav-scroll {
        display: flex;
        justify-content: flex-end;
      }
      .ant-tabs-ink-bar.ant-tabs-ink-bar-animated {
        display: none !important;
      }
      .ant-tabs-nav .ant-tabs-tab {
        border-radius: 2px;
        height: 30px;
        margin: 0px;
        margin-left: -1px;
        display: inline-flex;
        align-items: center;
        border: 1px solid ${theme.colors.borderColorBase};
        background: #fff;
        span svg {
          padding-left: 5px !important;
        }
      }
      .ant-tabs-nav .ant-tabs-tab-active {
        font-weight: 500;
        border: 1px solid ${theme.colors.primaryColor};
        background: ${theme.colors.primaryColor};
        color: #fff;
        border-radius: 2px;
        height: 30px;
        margin: 0px;
        display: inline-flex;
        align-items: center;
      }
      .ant-tabs-bar {
        border: none;
      }
      .ant-tabs-nav-wrap {
        margin-bottom: 0px;
        overflow: hidden;
    }
    }
    .ant-card-head .ant-tabs.ant-tabs-top.ant-card-head-tabs.ant-tabs-large.ant-tabs-line {
      width: 100%;
      display: block;
      justify-content: flex-end;
      height: 73px;
      padding-top: 8px;
  }
`;

const CardFrame = Styled(Card)`

  ${(props: ExecutionContext | {isButton: boolean}) => props.isbutton && BtnWraper(props.theme)}
  margin-bottom: 25px !important;

  background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteBackground};
  .ant-card-head{
    border-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).borderColorDefault};
    .ant-card-head-title{
      padding: 18px 0;
      font-size: 18px;
      font-weight: 600;
      color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
    }
  }
  .ant-card-body{
    padding: ${(props:{ bodypadding: boolean }) => (props.bodypadding ? `${props.bodypadding} !important` : '25px !important')};
    @media only screen and (max-width: 575px){
      padding: ${(props:{ bodypadding: boolean }) => (props.bodypadding ? `${props.bodypadding} !important` : '15px !important')};
    }
    table{
      .ant-tag{
        line-height: 18px;
        border: 0 none;
        text-transform: uppercase;
        font-size: 10px;
        color: #fff;
        &.early{
          background: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).primaryBackground}
        }
        &.late{
          background: ${(props: ExecutionContext) => props.theme.colors.warningColor}
        }
        &.complete{
          background: ${(props: ExecutionContext) => props.theme.colors.successColor}
        }
        &.progress{
          background: ${(props: ExecutionContext) => props.theme.colors.dangerColor}
        }
      }
    }
  }
  .ant-card-head-title .ant-page-header-heading-title{
    font-weight: 500;
  }
  .ant-card.ant-card-bordered {
      border-radius: 5px;
      overflow: hidden;
      border: none;
  }
  .custom-label {
    font-size: 13px;
    color: #868eae;
    display: inline-flex;
    align-items: center;
  }
  .custom-label:not(:last-child) {
    margin-right : 20px;
  }

  .custom-label span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 7px;
  }

  .ant-card-extra  {
    padding: 12px 0;
    .ant-dropdown-trigger{
      line-height: 0;
      order: 1;
      margin-left: 20px !important;
      @media only screen and (max-width: 575px){
        margin-left: 0 !important;
      }
    }
  }

  .growth-downward h1 sub,
  .growth-upward h1 sub {
    font-size: 14px;
    font-weight: 600;
    bottom: 0;
    left: 5px;
  }
`;

export { CardFrame };
