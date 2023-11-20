import { lightMode, darkMode, ThemeModeColors } from "./themeConfigure";

function getThemeModeColors(mode: string, themeColors: ThemeColors): ThemeModeColors {
  if (mode === 'lightMode') {
    return themeColors.lightMode;
  }

  return themeColors.darkMode;
}

export interface ThemeColors {
  lightMode: ThemeModeColors
  darkMode: ThemeModeColors

  primaryColor: string
  primaryHover: string
  secondaryColor: string
  secondaryHover: string
  linkColor: string
  linkHover: string
  successColor: string
  successHover: string
  warningColor: string
  warningHover: string
  errorColor: string
  errorHover: string
  infoColor: string
  infoHover: string
  darkColor: string
  darkHover: string
  grayColor: string
  grayHover: string
  lightColor: string
  lightHover: string
  whiteColor: string
  whiteHover: string
  dangerColor: string
  dangerHover: string
  white: string
  black: string
  pink: string
  dashColor: string
  extraLightColor: string
  extraLightHover: string
  headingColor: string
  textColor: string
  textColorSecondary: string
  disabledColor: string
  borderRadiusBase: string
  borderColorBase: string
  boxShadowBase: string
  borderColorLight: string
  borderColorNormal: string
  borderColorDeep: string
  bgColorLight: string
  bgColorNormal: string
  bgColorDeep: string
  lightGrayColor: string
  btnHeightLarge: string
  btnHeightSmall: string
  btnHeightExtraSmall: string
  graySolid: string
  btnDefaultColor: string
}

export interface ThemeConfig {
  mode: string
}

export interface UiTheme {
  colors: ThemeColors;
  config: ThemeConfig;

  fontFamily: string;
  fontSizeBase: string;

  //
  cardHeadBackground: string;
  cardHeadColor: string;
  cardBackground: string;
  cardHeadPadding: string;
  cardPaddingBase: string;
  cardRadius: string;
  cardShadow: string;

  //
  layoutBodyBackground: string;
  layoutHeaderBackground: string;
  layoutFooterBackground: string;
  layoutHeaderHeight: string;
  layoutHeaderPadding: string;
  layoutFooterPadding: string;
  layoutSiderBackground: string;
  layoutTriggerHeight: string;
  layoutTriggerBackground: string;
  layoutTriggerColor: string;
  layoutZeroTriggerWidth: string;
  layoutZeroTriggerHeight: string;

  //
  layoutSiderBackgroundLight: string;
  layoutTriggerBackgroundLight: string;
  layoutTriggerColorLight: string;

  //
  pageHeaderPadding: string;
  pageHeaderPaddingVertical: string;
  pageHeaderPaddingBreadcrumb: string;
  pageHeaderBackColor: string;
  pageHeaderGhostBg: string;
  pageHeaderHeadingSubTitle: string;

  //
  popoverColor: string;

  //
  alertSuccessBorderColor: string;
  alertSuccessBgColor: string;
  alertErrorBgColor: string;
  alertWarningBgColor: string;
  alertInfoBgColor: string;

  //
  radioButtonCheckedBg: string;

  //
  gridGutterWidth: string;

  //
  skeletonColor: string;

  //
  sliderRailBackgroundColor: string;
  sliderRailBackgroundColorHover: string;
  sliderTrackBackgroundColor: string;
  sliderTrackBackgroundColorHover: string;
  sliderHandleColor: string;
  sliderHandleSize: string;

  //
  inputBorderColor: string;
  inputHeightBase: string;
  inputHeightSm: string;
  inputHeightLg: string;
  inputPaddingHorizontal: string;
  inputPaddingHorizontalLg: string;
  inputPaddingVerticalBase: string;

  //
  rateStarColor: string;
  rateStarSize: string;

  //
  switchMinWidth: string;
  switchSmMinWidth: string;
  switchHeight: string;
  switchSmHeight: string;

  //
  resultTitleFontSize: string;
  resultSubtitleFontSize: string;
  resultIconFontSize: string;

  //
  tabsHorizontalPadding: string;
  tabsHorizontalMargin: string;

  //
  listItemPadding: string;

  //
  tagDefaultBg: string;
  tagDefaultColor: string;
  tagFontSize: string;

  //
  progressDefaultColor: string;
  progressTextFontSize: string;
}

const primaryColor = '#8231D3';
const primaryHover = '#6726A8';
const secondaryColor = '#5840FF';
const secondaryHover = '#3520C8';
const linkColor = '#1890ff';
const linkHover = '#0d79df';
const successColor = '#01B81A';
const successHover = '#0D811D';
const warningColor = '#FA8B0C';
const warningHover = '#D9790A';
const errorColor = '#FF0F0F';
const errorHover = '#CB0000';
const infoColor = '#00AAFF';
const infoHover = '#0787C7';
const darkColor = '#0A0A0A';
const darkHover = '#272525';
const grayColor = '#404040';
const grayHover = '#585858';
const lightColor = '#747474';
const lightHover = '#747474';
const whiteColor = '#ffffff';
const whiteHover = '#ADB5D9';
const dangerColor = '#FF0F0F';
const dangerHover = '#CB0000';
const extraLightColor = '#A0A0A0';
const extraLightHover = '#ADB5D9';
const headingColor = 'rgba(0, 0, 0, 0.85)';
const dashColor = '#E3E6EF';
const borderLight = '#F1F2F6';
const borderNormal = '#E3E6EF';
const borderDeep = '#C6D0DC';
const bgGrayLight = '#F8F9FB';
const bgGrayNormal = '#F4F5F7';
const bgGrayDeep = '#EFF0F3';
const lightGrayColor = '#868EAE';
const sliderRailColor = 'rgba(130,49,211,.20)';
const graySolid = '#9299b8';
const pinkColor = '#F63178';
const textColor = '#666D92';
const btnlg = '50px';
const btnsm = '38px';
const btnxs = '32px';

const themeColors: ThemeColors = {
  lightMode: lightMode,
  darkMode: darkMode,
  primaryColor: primaryColor, // primary color for all components
  primaryHover: primaryHover, // primary Hover color for all components
  secondaryColor: secondaryColor, // secondary color for all components
  secondaryHover: secondaryHover, // secondary Hover color for all components
  linkColor: linkColor, // link color
  linkHover: linkHover, // link Hover color
  successColor: successColor, // success state color
  successHover: successHover, // success Hover state color
  warningColor: warningColor, // warning state color
  warningHover: warningHover, // warning Hover state color
  errorColor: errorColor, // error state color
  errorHover: errorHover, // error Hover state color
  infoColor: infoColor, // info state color
  infoHover: infoHover, // info Hover state color
  darkColor: darkColor, // Dark state color
  darkHover: darkHover, // Dark Hover state color
  grayColor: grayColor, // Gray state color
  grayHover: grayHover, // Gray Hover state color
  lightColor: lightColor, // Light state color
  lightHover: lightHover, // Light Hover state color
  whiteColor: whiteColor, // White state color
  whiteHover: whiteHover, // White Hover state color
  dangerColor: dangerColor, // Danger state color
  dangerHover: dangerHover, // Danger Hover state color
  white: whiteColor,
  black: '#000000',
  pink: pinkColor,
  dashColor: dashColor, // info state color
  extraLightColor: extraLightColor, // Extra Light state color
  extraLightHover: extraLightHover, // Extra Light state color
  headingColor: headingColor, // heading text color
  textColor: textColor, // major text color
  textColorSecondary: grayColor, // secondary text color
  disabledColor: 'rgba(0, 0, 0, 0.25)', // disable state color
  borderRadiusBase: '4px', // major border radius
  borderColorBase: '#d9d9d9', // major border color
  boxShadowBase: '0 2px 8px rgba(0, 0, 0, 0.15)', // major shadow for layers
  borderColorLight: borderLight,
  borderColorNormal: borderNormal,
  borderColorDeep: borderDeep,
  bgColorLight: bgGrayLight,
  bgColorNormal: bgGrayNormal,
  bgColorDeep: bgGrayDeep,
  lightGrayColor: lightGrayColor,
  btnHeightLarge: btnlg,
  btnHeightSmall: btnsm,
  btnHeightExtraSmall: btnxs,
  graySolid: graySolid,
  btnDefaultColor: darkColor,
};

const theme: UiTheme = {
  colors: themeColors,
  config: {
    mode: 'lightMode',
  },

  fontFamily: "'Jost', sans-serif",
  fontSizeBase: '15px', // major text font size

  // cards
  cardHeadBackground: whiteColor,
  cardHeadColor: darkColor,
  cardBackground: whiteColor,
  cardHeadPadding: '16px',
  cardPaddingBase: '12px',
  cardRadius: '10px',
  cardShadow: '0 5px 20px rgba(146,153,184,0.03)',

  // Layout
  layoutBodyBackground: bgGrayNormal,
  layoutHeaderBackground: whiteColor,
  layoutFooterBackground: '#fafafa',
  layoutHeaderHeight: '64px',
  layoutHeaderPadding: '0 15px',
  layoutFooterPadding: '24px 15px',
  layoutSiderBackground: whiteColor,
  layoutTriggerHeight: '48px',
  layoutTriggerBackground: '#002140',
  layoutTriggerColor: whiteColor,
  layoutZeroTriggerWidth: '36px',
  layoutZeroTriggerHeight: '42px',
  // Layout light theme
  layoutSiderBackgroundLight: whiteColor,
  layoutTriggerBackgroundLight: whiteColor,
  layoutTriggerColorLight: 'rgba(0, 0, 0, 0.65)',

  // PageHeader
  pageHeaderPadding: '24px',
  pageHeaderPaddingVertical: '16px',
  pageHeaderPaddingBreadcrumb: '12px',
  pageHeaderBackColor: '#000',
  pageHeaderGhostBg: 'inherit',
  pageHeaderHeadingSubTitle: '15px',

  // Popover body background color
  popoverColor: darkColor,

  // alert
  alertSuccessBorderColor: successColor,
  alertSuccessBgColor: successColor + 15,
  alertErrorBgColor: errorColor + 15,
  alertWarningBgColor: warningColor + 15,
  alertInfoBgColor: infoColor + 15,

  // radio btn
  radioButtonCheckedBg: primaryColor,

  // gutter width (this was just a integer before)
  gridGutterWidth: '25px',

  // skeleton
  skeletonColor: borderLight,

  // slider
  sliderRailBackgroundColor: sliderRailColor,
  sliderRailBackgroundColorHover: sliderRailColor,
  sliderTrackBackgroundColor: primaryColor,
  sliderTrackBackgroundColorHover: primaryColor,
  sliderHandleColor: primaryColor,
  sliderHandleSize: '16px',

  // input
  inputBorderColor: borderNormal,
  inputHeightBase: '40px',
  inputHeightSm: '30px',
  inputHeightLg: '50px',
  inputPaddingHorizontal: '20px',
  inputPaddingHorizontalLg: '20px',
  inputPaddingVerticalBase: '12px',

  // rate
  rateStarColor: warningColor,
  rateStarSize: '13px',

  // Switch
  switchMinWidth: '35px',
  switchSmMinWidth: '30px',
  switchHeight: '18px',
  switchSmHeight: '15px',

  // result
  resultTitleFontSize: '20px',
  resultSubtitleFontSize: '12px',
  resultIconFontSize: '50px',

  // tabs
  tabsHorizontalPadding: '12px 15px',
  tabsHorizontalMargin: '0',

  // list
  listItemPadding: '10px 24px',

  // Tags
  tagDefaultBg: bgGrayDeep,
  tagDefaultColor: darkColor,
  tagFontSize: '11px',

  // Progress
  progressDefaultColor: primaryColor,
  progressTextFontSize: '14px',
};

export { theme, themeColors, getThemeModeColors };
