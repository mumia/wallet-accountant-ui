import type { CSSProp } from "styled-components";
import Styled, { ExecutionContext, ThemeProvider } from 'styled-components';
import { UiTheme } from './config/theme/themeVariables';
import { ExecutionProps } from "styled-components/dist/types";

type ThemeType = typeof UiTheme;

declare module "styled-components" {
  export interface DefaultTheme extends ThemeType {}

  export interface ExecutionContext extends ExecutionProps {
    theme: UiTheme;
  }
}

export { ThemeProvider, ExecutionContext };

export default Styled

declare module "react" {
  interface DOMAttributes<T> {
    css?: CSSProp;
  }
}