import Styled, { ExecutionContext } from "styled-components";
import { getThemeModeColors } from "../../config/theme/themeVariables";

interface ExecutionContextWithType extends ExecutionContext {
  $typeColor: string
}

const OverviewCardWrap = Styled.div`
    margin-bottom: 25px;
    .ant-card {
        background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteBackground};
        &.ninjadash-overview-halfCircle-card{
            overflow: hidden;
            .ant-card-body {
                padding: 24px 25px 12px !important;
                .ninjadash-overview-card {
                    .ninjadash-overview-card__bottom {
                        margin-top: 0;
                        .ninjadash-overview-status{
                            background-color: transparent;
                            padding: 0;
                        }
                    }
                    .ninjadash-overview-card__top--icon{
                        position: absolute;
                        top: -9px;
                        right: -38%;
                        width: 230px;
                        height: 168px;
                        border-radius: 100%;
                        padding: 0 30px;
                        justify-content: flex-start;
                        @media only screen and (max-width: 1699px){
                            right: -48%;
                        }
                        @media only screen and (max-width: 1599px){
                            right: -20%;
                            top: -12px;
                        }
                        @media only screen and (max-width: 1399px){
                            right: -24%;
                            top: -15px;
                        }
                        @media only screen and (max-width: 991px){
                            right: -35%;
                        }
                        @media only screen and (max-width: 767px){
                            right: -46%;
                            padding: 0 18px;
                        }
                        @media only screen and (max-width: 650px){
                            right: -56%;
                        }
                        @media only screen and (max-width: 575px){
                            right: -30%;
                        }
                        @media only screen and (max-width: 475px){
                            right: -44%;
                            top: -17px;
                        }
                        @media only screen and (max-width: 375px){
                            right: -48%;
                        }
                        svg{
                            width: 40px;
                            @media only screen and (max-width: 767px){
                                width: 30px;
                            }
                        }
                    }
                    .ninjadash-overview-card__top--content{
                        .ninjadahs-overview-label{
                            display: block;
                            margin-bottom: 4px;
                            font-size: 15px;
                        }
                    }
                }
            }
        }
    }
    .ant-card-body{
        padding: 25px !important;
        @media only screen and (max-width: 767px){
            padding: 20px !important;
        }
        @media only screen and (max-width: 575px){
            padding: 15px !important;
        }
        .ninjadash-overview-total {
            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
        }
        .ninjadash-overview-card{
            .ninjadash-overview-card__top{
                .ninjadash-overview-card__top--icon{
                    width: 58px;
                    height: 58px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 14px;
                    @media only screen and (max-width: 767px){
                        width: 48px;
                        height: 48px;
                    }
                    div{
                        line-height: 1;
                    }
                    svg,
                    img{
                        width: 24px;
                        height: 24px;
                    }
                    &.ninjadash-primary{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.primaryColor}15;
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
                        }
                    }
                    &.ninjadash-secondary{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.secondaryColor}15;
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => props.theme.colors.secondaryColor};
                        }
                    }
                    &.ninjadash-success{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.successColor}15;
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => props.theme.colors.successColor};
                        }
                    }
                    &.ninjadash-warning{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.warningColor}15;
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => props.theme.colors.warningColor};
                        }
                    }
                    &.ninjadash-info{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.infoColor}15;
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => props.theme.colors.infoColor};
                        }
                    }
                }
                .ninjadash-overview-card__top--content{
                    .ninjadash-overview-total{
                        font-size: 30px;
                        line-height: 1.45;
                        font-weight: 600;
                        margin-bottom: 0;
                        color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
                        @media only screen and (max-width: 1599px){
                            font-size: 24px;
                        }
                        @media only screen and (max-width: 1399px){
                            font-size: 20px;
                        }
                    }
                    .ninjadahs-overview-label{
                        font-size: 15px;
                        font-weight: 400;
                        color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText};
                        @media only screen and (max-width: 767px){
                            font-size: 15px;
                        }
                    }
                }
                &.ninjadash-overview-card-theme-2{
                    .ninjadash-overview-card__top--icon{
                        order: 2;
                    }
                }
            }
            .ninjadash-overview-card__bottom{
                margin-top: 12px;
                .ninjadash-overview-status{
                    display: inline-flex;
                    align-items: center;
                    width: 100%;
                    padding: 0 10px;
                    min-height: 44px;
                    border-radius: 8px;
                    background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).statusBackground};
                    span{
                        font-size: 14px;
                    }
                    .ninjadash-status-label{
                        margin-left :: 10px;
                        color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayLightText};
                    }
                    .ninjadash-status-rate{
                        display: flex;
                        align-items: center;
                        font-weight: 500;
                        svg,
                        img{
                            width: 20px;
                            margin-right :: -1px;
                        }
                    }
                    &.ninjadash-status-growth{
                        .ninjadash-status-rate{
                            color: ${(props: ExecutionContext) => props.theme.colors.successColor};
                        }
                    }
                    &.ninjadash-status-down{
                        .ninjadash-status-rate{
                            color: ${(props: ExecutionContext) => props.theme.colors.dangerColor}
                        }
                    }
                }
            }
        }
    }
    &.ninjadash-overview-card-support{
        .ant-card-body{
            padding: 40.5px 25px !important;
        }
    }
`;

const OverviewCardMeshWrap = Styled.div`
    &.ninjadash-overview-card-single{
        position: relative;
        margin-bottom: 25px;
        &:not(:last-child){
            &:after{
                position: absolute;
                width: 1px;
                height: 70px;
                right: -60px;
                top: 50%;
                transform: translateY(-50%);
                content: '';
                z-index: 10;
                background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).lightBorder};
                @media only screen and (max-width: 1799px){
                    right: -30px;
                }
                @media only screen and (max-width: 1599px){
                    right: 0px;
                }
                @media only screen and (max-width: 1199px){
                    display: none;
                }
            }
        }
        &.ninjadash-icon-circle{
            .ninjadash-overview-card__left{
                .ninjadash-overview-card__left--icon{
                    border-radius: 50%;
                    &.ninjadash-primary{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                        }
                    }
                    &.ninjadash-secondary{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.secondaryColor};
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                        }
                    }
                    &.ninjadash-info{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.infoColor};
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                        }
                    }
                    &.ninjadash-success{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.successColor};
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                        }
                    }
                    &.ninjadash-warning{
                        background-color: ${(props: ExecutionContext) => props.theme.colors.warningColor};
                        svg path,
                        i{
                            fill: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteText};
                        }
                    }
                }
            }
            
        }
        .ant-card{
            border-radius: 0px;
            box-shadow: 0 0;
            background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteBackground};
            .ant-card-body{
                @media only screen and (max-width: 1599px){
                    padding: 20px !important;
                }
                @media only screen and (max-width: 1399px){
                    padding: 12px !important;
                }
                @media only screen and (max-width: 991px){
                    padding: 15px !important;
                }
            }
        }
        &:first-child{
            .ant-card{
                border-radius: 10px 0 0 10px;
            }
        }
        &:last-child{
            .ant-card{
                border-radius: 0 10px 10px 0;
            }
        }
        &:not(:last-child){
            .ninjadash-overview-card{
                position: relative;
                &:after{
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: 1px;
                    height: 100%;
                    content: '';
                    background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).lightBorder};
                }
            }
        }
    }

    .ninjadash-overview-card{
        display: flex;
        .ninjadash-overview-card__left{
            .ninjadash-overview-card__left--icon{
                display: flex;
                align-items: center;
                justify-content: center;
                width: 70px;
                height: 70px;
                border-radius: 14px;
                margin-right :: 25px;
                @media only screen and (max-width: 1640px){
                    width: 50px;
                    height: 50px;
                    border-radius: 8px;
                    margin-right :: 15px;
                }
                @media only screen and (max-width: 1399px){
                    width: 40px;
                    height: 40px;
                    margin-right :: 10px;
                }
                @media only screen and (max-width: 991px){
                    width: 50px;
                    height: 50px;
                }
                >div{
                    line-height: 1;
                }
                svg{
                    @media only screen and (max-width: 1599px){
                        width: 20px;
                        height: 20px;
                    }
                }
                &.ninjadash-primary{
                    background-color: ${(props: ExecutionContext) => props.theme.colors.primaryColor}15;
                    svg path,
                    i{
                        fill: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
                        color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
                    }
                }
                &.ninjadash-secondary{
                    background-color: ${(props: ExecutionContext) => props.theme.colors.secondaryColor}15;
                    svg path,
                    i{
                        fill: ${(props: ExecutionContext) => props.theme.colors.secondaryColor};
                        color: ${(props: ExecutionContext) => props.theme.colors.secondaryColor};
                    }
                }
                &.ninjadash-success{
                    background-color: ${(props: ExecutionContext) => props.theme.colors.successColor}15;
                    svg path,
                    i{
                        fill: ${(props: ExecutionContext) => props.theme.colors.successColor};
                        color: ${(props: ExecutionContext) => props.theme.colors.successColor};
                    }
                }
                &.ninjadash-warning{
                    background-color: ${(props: ExecutionContext) => props.theme.colors.warningColor}15;
                    svg path,
                    i{
                        fill: ${(props: ExecutionContext) => props.theme.colors.warningColor};
                        color: ${(props: ExecutionContext) => props.theme.colors.warningColor};
                    }
                }
                &.ninjadash-info{
                    background-color: ${(props: ExecutionContext) => props.theme.colors.infoColor}15;
                    svg path,
                    i{
                        fill: ${(props: ExecutionContext) => props.theme.colors.infoColor};
                        color: ${(props: ExecutionContext) => props.theme.colors.infoColor};
                    }
                }
                &.ninjadash-danger{
                    background-color: ${(props: ExecutionContext) => props.theme.colors.dangerColor}15;
                    svg path,
                    i{
                        fill: ${(props: ExecutionContext) => props.theme.colors.dangerColor};
                        color: ${(props: ExecutionContext) => props.theme.colors.dangerColor};
                    }
                }
            }
        }
        .ninjadash-overview-card__right{
            display: flex;
            .ninjadash-overview-card__right--content{
                margin-right :: 25px;
                @media only screen and (max-width: 1399px){
                    margin-right :: 15px;
                }
                .ninjadash-overview-total{
                    font-size: 30px;
                    line-height: 1.2;
                    font-weight: 600;
                    margin-bottom: 0;
                    color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
                    @media only screen and (max-width: 1599px){
                        font-size: 24px;
                    }
                    @media only screen and (max-width: 1399px){
                        font-size: 18px;
                    }
                    @media only screen and (max-width: 991px){
                        font-size: 20px;
                    }
                }
                .ninjadahs-overview-label{
                    font-size: 16px;
                    color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText}
                }
            }
            .ninjadash-overview-status{
                margin-top: 6px;
                &.ninjadash-status-growth{
                    .ninjadash-status-rate{
                        color: ${(props: ExecutionContext) => props.theme.colors.successColor};
                    }
                }
                &.ninjadash-status-down{
                    .ninjadash-status-rate{
                        color: ${(props: ExecutionContext) => props.theme.colors.dangerColor};
                    }
                }
                .ninjadash-status-rate{
                    display: flex;
                    align-items: center;
                    font-size: 14px;
                    font-weight: 500;
                    svg{
                        width: 20px;
                        height: 18px;
                    }
                }
            }
        }
    }
`;

const InfoCardStyle = Styled.article`
    ${(props: ExecutionContextWithType | ExecutionContext) => {
      const themeModeColors = getThemeModeColors(props.theme.config.mode, props.theme.colors);
    
      return `
        background-color: ${themeModeColors.whiteBackground};
        padding: 14px 15px;
        text-align: center;
        border-radius: 10px;
        margin-bottom: 25px;
        box-shadow: 0px 5px 20px ${props.theme.colors.extraLightColor}05;

        .ninjadash-infocard-icon {
            width: 58px;
            height: 58px;
            background-color: ${props.$typeColor/*theme[`${type}-color`]*/}20;
            color: ${props.$typeColor/*theme[`${type}-color`]*/};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin: 2px auto 10px;
            border-radius: 14px;
            svg{
                width: 34px;
                height: 32px;
            }

        }

        .ninjadash-infocard-text {
            font-size: 16px;
            margin-bottom: 0;
            color: ${themeModeColors.grayText};
        }
        .ninjadash-infocard-label {
            font-size: 30px;
            font-weight: 500;
            margin-bottom: 4px;
            color: ${themeModeColors.darkText};
        }
    `}}
`;

const NewsletterStyle = Styled.figure`
    &.ninjadash-newsletter-theme-2{
        min-height: 135px;
        padding: 15px 0 15px 25px;
        justify-content: flex-start;
        figcaption{
            margin-left :: 15px;
        }
    }
    ${(props: ExecutionContext) => {
  const themeModeColors = getThemeModeColors(props.theme.config.mode, props.theme.colors);

  return `
            background-color: ${themeModeColors.whiteBackground};
            padding: 25px 0 25px 25px;
            text-align: left;
            border-radius: 10px;
            box-shadow: 0px 5px 20px rgba(173,181,273,.05);
            display: inline-flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            margin-bottom: 25px;
            min-height: 160px;
            @media only screen and (max-width: 575px){
                padding: 15px;
                flex-direction: column;
            }
    
            figcaption {
                margin-right: 15px;
                @media only screen and (max-width: 1699px){
                    margin-right: 10px; 
                }
                @media only screen and (max-width: 575px){
                    margin-top: 15px;
                    margin-right: 0;
                    text-align: center;
                }
                h2,
                h4 {
                    font-size: 24px;
                    font-weight: 600;
                    line-height: 1;
                    margin: 0 0 10px;
                    color: ${themeModeColors.darkText};
                    @media only screen and (max-width: 575px){
                        font-size: 20px;
                    }
                }
                h4{
                    font-size: 20px;
                }
                p {
                    font-size: 15px;
                    margin-bottom: 0;
                    color: ${themeModeColors.grayText}
                }
                button{
                    margin-top: 14px;
                }
            }
            img{
                margin-bottom: -16px;
                margin-top: -24px;
                max-width: 150px;
                @media only screen and (max-width: 1699px){
                    max-width: 100px;
                }
                @media only screen and (max-width: 575px){
                    margin-bottom: 0;
                    margin-top: 15px;
                }
            }
        `;
}
}
`;

const CourseCardWrap = Styled.div`
    &.ninjadash-course-card-single{
        margin-bottom: 25px;
        .ant-card{
            background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteBackground};
        }
        .ant-card-body{
            padding: 18px !important;
        }
        .ninjadash-course-card-thumbnail{
            border-radius: 10px;
            margin-bottom: 15px;
            img{
                max-width: 332px;
                @media only screen and (max-width: 1599px){
                    max-width: 100%;
                    width: 100%;
                }
            }
        }
        .ninjadash-course-card-title{
            font-size: 20px;
            margin-bottom: 12px;
            font-weight: 600;
            @media only screen and (max-width: 1399px){
                font-size: 18px;
            }
            a{
                color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
                &:hover{
                    color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
                }
            }
        }
        .ninjadash-course-card-author{
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            img{
                max-width: 30px;
                margin-right :: 10px;
            }
            .ninjadash-course-card-author__name{
                font-size: 15px;
                color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayLightText};
            }
        }
        .ninjadash-course-card-meta{
            display: flex;
            justify-content: space-between;
            align-items: center;
            .ninjadash-course-card-meta__pricing{
                font-size: 20px;
                font-weight: 600;
                color: ${(props: ExecutionContext) => props.theme.colors.successColor};
                @media only screen and (max-width: 1399px){
                    font-size: 18px;
                }
            }
        }
        .ninjadash-course-card-meta__right{
            display: flex;
            align-items: center;
            margin: -5px;
            li{
                display: inline-flex;
                align-items: center;
                min-height: 32px;
                border-radius: 20px;
                padding: 0 15px;
                margin: 5px;
                @media only screen and (max-width: 1399px){
                    padding: 0 10px;
                }
                &.bg-secondary{
                    color: ${(props: ExecutionContext) => props.theme.colors.secondaryColor};
                    background-color: ${(props: ExecutionContext) => props.theme.config.mode === "lightMode" ? "rgba(88,64,255,.15)" : "#fff"};
                }
                &.bg-primary{
                    color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
                    background-color: ${(props: ExecutionContext) => props.theme.config.mode === "lightMode" ? "rgba(251,53,134,.15)" : "#fff"};
                }
                span{
                    font-size: 13px;
                    line-height: 1;
                    font-weight: 500;
                    @media only screen and (max-width: 1399px){
                        font-size: 12px;
                    }
                }
                svg{
                    width: 14px;
                    margin-right :: 3px;
                }
            }
        }
    }
`;

const ProfileCardWrapper = Styled.figure`
  ${(props: ExecutionContext) => {
    const themeModeColors = getThemeModeColors(props.theme.config.mode, props.theme.colors);
    return `
    width: 100%;
    min-height: 360px;
    background-color: ${themeModeColors.whiteBackground};        
    text-align: center;
    border-radius: 10px;
    box-shadow: 0px 5px 20px ${props.theme.colors.extraLightColor}05;
    position: relative;
    @media only screen and (max-width: 991px){
      min-height: auto;
      margin-bottom: 25px;
    }

    figcaption {
      .ninjadash-profile-top-img {
        position: static;
        width: 100%;
      }
    }

    .ninjadash-profile-content {
      padding: 0 0 45px;
      margin-top: -75px;
      .ninjadash-profile-content__img {
        margin-bottom: 10px;
        img{
        padding: 5px;
        border-radius: 50%;
        max-width: 110px;
        background-color: ${themeModeColors.whiteBackground};
      }
    }
    .ninjadash-profile-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 2px;
      color: ${themeModeColors.darkText};
    }
    .ninjadash-profile-text {
      margin-bottom: 18px;
      color: ${themeModeColors.grayLightText};
    }
    .ninjadash-profile-socials{
      display: flex;
      align-items: center;
      justify-content: center !important;
      margin: -5px;
      li{
        margin: 5px;
        span.fa{
        color: #fff;
        fill: #fff;
      }
      &.ninjadash-facebook{
        a{
          background-color: ${props.theme.colors.primaryColor};
        }
      }
      &.ninjadash-twitter{
        a{
          background-color: ${props.theme.colors.secondaryColor};
        }
      }
      &.ninjadash-dribble{
      a{
        background-color: ${props.theme.colors.infoColor};
      }
    }
    a{
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      line-height: 1;
    }
  }`;
  }}
`;

const BlogCardStyleWrap = Styled.figure`
    .ninjadash-blog{
        padding: 25px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(173,181,217,.05);
        margin-bottom: 25px;
        background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).whiteBackground};
        &:hover{
            .ninjadash-blog-thumb{
                &:after{
                    height: 100%;
                }
            }
        }
        .ninjadash-blog-thumb{
            position: relative;
            &:after{
                position:  absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 0%;
                content: '';
                border-radius: 10px;
                transition: .35s;
                background-color: ${(props: ExecutionContext) => props.theme.colors.darkColor}15;
            }
        }
        &.ninjadash-blog-style-3,
        &.ninjadash-blog-style-2{
            padding: 0px;
            .ninjadash-blog__title{
                margin: 15px 0 12px;
            }
            figcaption{
                padding: 0 25px 25px;
            }
            .ninjadash-blog-thumb{
                &:after{
                    border-radius: 10px 10px 0 0;
                }
            }
            .ninjadash-blog__image{
                border-radius: 10px 10px 0 0;
            }
        }
        .ninjadash-blog__image{
            width: 100%;
            border-radius: 10px;
        }
        .ninjadash-blog-meta{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
            &.ninjadash-blog-meta-theme-3{
                justify-content: flex-start;
                margin: 7px -3px -3px;
                .ninjadash-blog-meta__single{
                    position: relative;
                    margin: 3px;
                    &:before{
                        position: absolute;
                        left: 0;
                        top: calc(50% - 4px);
                        width: 4px;
                        height: 4px;
                        border-radius: 50%;
                        background-color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).lightText};
                    }
                    &:not(:first-child){
                        padding-left: 10px;
                        &:before{
                            content: '';
                        }
                    }
                }
            }
        }
        .ninjadash-blog-meta__single{
            display: inline-block;
            font-size: 15px;
            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).lightText};
        }
        .ninjadash-blog__title{
            font-size: 20px;
            font-weight: 600;
            margin: 10px 0 5px;
            a{
                color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).darkText};
                &:hover{
                    color: ${(props: ExecutionContext) => props.theme.colors.primaryColor};
                }
            }
        }
        .ninjadash-blog__text{
            font-size: 16px;
            margin-bottom: 15px;
            color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayText};
        }
        .ninjadash-blog__bottom{
            display: flex;
            justify-content: space-between;
        }
        .ninjadash-blog__author{
            .ninjadash-blog__author-img{
                max-width: 32px;
                border-radius: 50%;
            }
            .ninjadash-blog__author-name{
                font-size: 15px;
                margin-left :: 10px;
                color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayLightText};
            }
        }
        .ninjadash-blog__meta{
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            margin: -9px;
            .ninjadash-blog__meta--item{
                margin: 9px;
                span{
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    line-height: 1;
                    color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayLightText};
                    svg{
                        width: 12px;
                        height: 12px;
                        margin-right :: 4px;
                        color: ${(props: ExecutionContext) => getThemeModeColors(props.theme.config.mode, props.theme.colors).grayLightText};
                    }
                }
            }
        }
    }
`;

export {
  OverviewCardWrap,
  OverviewCardMeshWrap,
  InfoCardStyle,
  NewsletterStyle,
  CourseCardWrap,
  BlogCardStyleWrap,
  ProfileCardWrapper
};
