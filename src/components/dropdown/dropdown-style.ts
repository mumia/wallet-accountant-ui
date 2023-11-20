import { Dropdown } from 'antd';
import Styled, { ExecutionContext } from "styled-components";
import { getThemeModeColors } from "../../config/theme/themeVariables";

const Content = Styled.div`
    background: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteBackground};
    box-shadow: 0px 0px 2px #888;
    padding: 4px 0;
    a i, a svg, a img {
        margin-right: 8px;
    }
    a {
        display: flex;
        font-size: 14px;
        color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText};
        padding: 6px 12px;
        span{
            line-height: 1.25;
        }
    }
    a:hover {
        background: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).primaryTransparent};
        color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).menuActive};
    }
    .dropdown-theme-2{
        a:hover{
            background: ${(props: ExecutionContext) => props.theme.colors.pink}10;
            color: ${(props: ExecutionContext) => props.theme.colors.pink}
        }
    }
`;

const DropdownStyle = Styled(Dropdown)`
    
`;

export { Content, DropdownStyle };
