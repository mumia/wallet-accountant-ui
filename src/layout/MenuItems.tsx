import { UilCreditCard, UilDashboard, UilEllipsisV, UilWallet } from "@iconscout/react-unicons";
import { Menu } from "antd";
import * as PropTypes from "prop-types";
import * as React from "react";
import { ReactElement, useState } from "react";
import { NavLink } from "react-router-dom";
import { MenuInfo } from "rc-menu/lib/interface";
import { InferProps } from "prop-types";

function MenuItems(props: InferProps<typeof MenuItems.propTypes>) {
  function getItem(
    label: string,
    path: string,
    key: string,
    icon: ReactElement,
    children?: any,
    type?: any
  ) {
    const labelElement = (
      <NavLink to={`${path}`}>
        {label}
      </NavLink>
    );

    let iconElement = null;
    iconElement = (
      <NavLink className="menuItem-iocn" to={`${path}/`}>
        {icon}
      </NavLink>
    );

    return {
      key: key,
      icon: iconElement,
      children: children,
      label: labelElement,
      type: type
    };
  }

  const path = "/admin";
  const pathName = window.location.pathname;
  const pathArray = pathName && pathName !== "/" ? pathName.split(path) : [];
  const mainPath = pathArray.length > 1 ? pathArray[1] : "";
  let mainPathSplit = mainPath.split("/");
  mainPathSplit.shift();


  const [openKeys, setOpenKeys] = useState(
    [`${mainPathSplit.length > 2 ?  mainPathSplit[1] : "dashboard"}`]
  );

  const onOpenChange = (keys: string[]) => {
    if (keys.length > 0 && keys[keys.length - 1] !== "recharts") {
      keys = [keys[keys.length - 1]];
    }

    setOpenKeys(keys);
  };

  const onClick = (info: MenuInfo) => {
    if (info.keyPath.length === 1) setOpenKeys([]);
  };

  const items = [
    getItem(
      "dashboard",
      `${path}/`,
      "dashboard",
      <UilDashboard />
    ),
    getItem(
      "accounts",
      `${path}/accounts`,
      "accounts",
      <UilCreditCard />
    ),
    getItem(
      "movements",
      `${path}/movements`,
      "movements",
      <UilWallet />
    )
  ];

  let defaultSelectedKeys = mainPathSplit.join('_');
  if (defaultSelectedKeys === '') {
    defaultSelectedKeys = 'dashboard';
  }

  return (
    <Menu
      onOpenChange={onOpenChange}
      onClick={onClick}
      mode="inline"
      defaultSelectedKeys={[`${defaultSelectedKeys}`]}
      defaultOpenKeys={[`${mainPathSplit.length > 2 ? mainPathSplit[1] : "dashboard"}`]}
      overflowedIndicator={<UilEllipsisV />}
      openKeys={openKeys}
      items={items}
    />
  );
}

MenuItems.propTypes = {
  toggleCollapsed: PropTypes.func
};

export default MenuItems;
