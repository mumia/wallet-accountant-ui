export interface ThemeModeColors {
  mainBackground: string;
  mainBackgroundLight: string;
  darkBackground: string;
  darkerBackground: string;
  whiteBackground: string;
  generalBackground: string;
  brandBackground: string;
  statusBackground: string;
  primaryBackground: string;
  primaryTransparent: string;
  lightBackground: string;
  lightBorder: string;
  whiteText: string;
  grayText: string;
  grayLighterText: string;
  grayLightText: string;
  darkText: string;
  lightText: string;
  extraLightText: string;
  lightGrayText: string;
  extraLight: string;
  borderColorDefault: string;
  borderColorCheckbox: string;
  borderColorSecondary: string;
  borderColorDeep: string;
  menuIconColor: string;
  menuActive: string;
  menuActiveBg: string;
  scrollBg: string;
  chatBg: string;
  chatReplyBg: string;
  chatReplyText: string;
  inputBg: string;
}

export const lightMode: ThemeModeColors = {
  mainBackground: "#F8F9FB",
  mainBackgroundLight: "#F8F9FB",
  darkBackground: "#EFF0F3",
  darkerBackground: "#202444",
  whiteBackground: "#FFFFFF",
  generalBackground: "#F4F5F7",
  brandBackground: "#FFFFFF",
  statusBackground: "#F8F9FB",
  primaryBackground: "#8231D3",
  primaryTransparent: "#F2EAFB",
  lightBackground: "#F8F9FB",
  lightBorder: "#F1F2F6",
  whiteText: "#ffffff",
  grayText: "#404040",
  grayLighterText: "#404040",
  grayLightText: "#747474",
  darkText: "#0A0A0A",
  lightText: "#747474",
  extraLightText: "#A0A0A0",
  lightGrayText: "#404040",
  extraLight: "#A0A0A0",
  borderColorDefault: "#F1F2F6",
  borderColorCheckbox: "#C6D0DC",
  borderColorSecondary: "#E3E6EF",
  borderColorDeep: "#C6D0DC",
  menuIconColor: "#A0A0A0",
  menuActive: "#8231D3",
  menuActiveBg: "#F2EAFB",
  scrollBg: "#E3E6EF",
  chatBg: "#F4F5F7",
  chatReplyBg: "#404040",
  chatReplyText: "#ffffff",
  inputBg: "#ffffff"
};

export const darkMode: ThemeModeColors = {
  mainBackground: "#010413",
  mainBackgroundLight: "#282B37",
  darkBackground: "#282B37",
  darkerBackground: "#1B1E2B",
  whiteBackground: "#282B37",
  generalBackground: "#282B37" /* 6% */,
  brandBackground: "#282B37",
  statusBackground: "#323541",
  primaryBackground: "#1B1E2B",
  primaryTransparent: "#323541",
  lightBackground: "#323541",
  lightBorder: "#282B37",
  whiteText: "#1B1E2B",
  grayText: "#A4A5AA" /* 60% */,
  grayLighterText: "#E1E1E3" /* 87% of #fff */,
  grayLightText: "#A4A5AA",
  darkText: "#E1E1E3" /* 87% */,
  lightText: "#4D4F5A" /* 30% */,
  extraLightText: "#A4A6AB",
  lightGrayText: "#E1E1E3",
  extraLight: "#ADAEB3",
  borderColorDefault: "#323541",
  borderColorCheckbox: "#A4A6AB",
  borderColorSecondary: "#494B55",
  borderColorDeep: "#070A19",
  menuIconColor: "#A4A5AA",
  menuActive: "#ffffff",
  menuActiveBg: "#282B37",
  scrollBg: "#565A65" /* 30% */,
  chatBg: "#282B37",
  chatReplyBg: "#282B37",
  chatReplyText: "#A4A5AA",
  inputBg: "#282B37",
};
