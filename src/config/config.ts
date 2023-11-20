import { ThemeColors, themeColors } from "./theme/themeVariables";

export interface Config {
  mainTemplate: string;
  themeColors: ThemeColors
}

const config: Config = {
  mainTemplate: 'lightMode',
  themeColors: themeColors,
};

export default config;
