import * as React from "react";
import { CSSProperties, Suspense, useEffect, useState } from "react";
import { Button, Layout, Spin } from "antd";
import { UilEllipsisV } from "@iconscout/react-unicons";
import { Scrollbars } from "@pezhmanparsaee/react-custom-scrollbars";
import { LayoutContainer } from "./Style";
import MenuItems from "./MenuItems";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";
import logoDark from "../static/img/logo_dark.svg";
import logoWhite from "../static/img/logo_white.svg";
import leftBar from "../static/img/icon/left-bar.svg";

const {
  Header,
  Sider,
  Content
} = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [hide, setHide] = useState(true);
  // const [customizerAction, setCustomizerAction] = useState(false);

  const lightMode = useAppSelector((state) => state.layoutMode.mode === "lightMode");

  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    function updateDimensions() {
      setCollapsed(window.innerWidth <= 1200 && true);
    }

    window.addEventListener("resize", updateDimensions);
    updateDimensions();

    return function cleanup() {
      window.removeEventListener("resize", updateDimensions);
    };
  }, [pathname]);

  const left = "left";
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const toggleCollapsedMobile = () => {
    if (window.innerWidth <= 990) {
      setCollapsed(!collapsed);
    }
  };

  const onShowHide = () => {
    setHide(!hide);
    // setSearchHide(true);
  };

  const SideBarStyle: CSSProperties = {
    margin: "63px 0 0 0",
    padding: "20px 20px 55px 0",
    overflowY: "auto",
    height: "100vh",
    position: "fixed",
    [left]: 0,
    zIndex: 988
  };

  const renderView = (style: { [key: string]: string }) => {
    const customStyle = { marginRight: "-17px" };

    return <div style={{ ...style, ...customStyle }} />;
  };

  const renderThumbVertical = (style: { [key: string]: string }) => {
    const thumbStyle = {
      borderRadius: 6,
      backgroundColor: lightMode ? "#ffffff16" : "#F1F2F6",
      [left]: "2px"
    };

    return <div style={{ ...style, ...thumbStyle }} />;
  };

  const renderThumbHorizontal = (style: { [key: string]: string }) => {
    const thumbStyle = {
      borderRadius: 6,
      backgroundColor: lightMode ? "#ffffff16" : "#F1F2F6"
    };

    return <div style={{ ...style, ...thumbStyle }} />;
  };

  return (
    <LayoutContainer>
      <Layout className="layout">
        <Header
          style={{
            position: "fixed",
            width: "100%",
            top: 0,
            "left": 0
          }}
        >
          <div className="ninjadash-header-content d-flex">
            <div className="ninjadash-header-content__left">
              <div className="navbar-brand align-cener-v">
                <Link
                  className="ninjadash-logo"
                  to="/admin"
                >
                  <img src={lightMode ? logoDark : logoWhite} alt="" />
                </Link>
                <Button type="link" onClick={toggleCollapsed}>
                  <img src={leftBar} alt="menu" />
                </Button>
              </div>
            </div>
            <div className="ninjadash-header-content__right d-flex">
              <div className="ninjadash-navbar-menu d-flex align-center-v">
              </div>
              <div className="ninjadash-nav-actions">
                {/*  <AuthInfo />*/}
              </div>
            </div>
            <div className="ninjadash-header-content__mobile">
              <div className="ninjadash-mobile-action">
                <Link className="btn-auth" onClick={onShowHide} to="#">
                  <UilEllipsisV />
                </Link>
              </div>
            </div>
          </div>
        </Header>
        <Layout>
          <Sider width={280} style={SideBarStyle} collapsed={collapsed} theme={lightMode ? "light" : "dark"}>
            <Scrollbars
              className="custom-scrollbar"
              autoHide
              autoHideTimeout={500}
              autoHideDuration={200}
              renderThumbHorizontal={renderThumbHorizontal}
              renderThumbVertical={renderThumbVertical}
              renderView={renderView}
              renderTrackVertical={(props) => <div {...props} className="ninjadash-track-vertical" />}
            >
              <MenuItems toggleCollapsed={toggleCollapsedMobile} />
            </Scrollbars>
          </Sider>
          <Layout className="wa-main-layout">
            <Content>
              <Suspense
                fallback={
                  <div className="spin">
                    <Spin />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </Content>
          </Layout>
        </Layout>
      </Layout>
      {window.innerWidth <= 991 ? (
        <span className={collapsed ? "ninjadash-shade" : "ninjadash-shade show"} onClick={toggleCollapsed} />
      ) : (
        ""
      )}
    </LayoutContainer>
  );
};

export default AdminLayout;
