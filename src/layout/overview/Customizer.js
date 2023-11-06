/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UilPen from '@iconscout/react-unicons/icons/uil-pen';
import UilTimes from '@iconscout/react-unicons/icons/uil-times';
import FontAwesome from 'react-fontawesome';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { CustomizerWrap } from './Style';
import { changeLayoutMode, changeMenuMode, changeDirectionMode } from '../../redux/themeLayout/actionCreator';

function Customizer() {
  const { t } = useTranslation();
  const { rtl, layoutMode, topMenu } = useSelector((state) => {
    return {
      rtl: state.ChangeLayoutMode.rtlData,
      layoutMode: state.ChangeLayoutMode.mode,
      topMenu: state.ChangeLayoutMode.topMenu,
    };
  });
  const [state, setState] = useState({
    customizerAction: false,
  });
  const { customizerAction } = state;

  const dispatch = useDispatch();

  // open Customizer Function
  const showCustomizer = () => {
    setState({
      customizerAction: !customizerAction,
    });
  };

  const darkmodeActivated = () => {
    document.body.classList.add('dark-mode');
  };

  const darkmodeDiactivated = () => {
    document.body.classList.remove('dark-mode');
  };
  const changeLayout = (mode) => {
    dispatch(changeLayoutMode(mode));
  };
  const changeNavbar = (topMode) => {
    const html = document.querySelector('html');
    if (topMode) {
      html.classList.add('ninjadash-topmenu');
    } else {
      html.classList.remove('ninjadash-topmenu');
    }
    dispatch(changeMenuMode(topMode));
  };
  const changeLayoutDirection = (rtlMode) => {
    if (rtlMode) {
      const html = document.querySelector('html');
      html.setAttribute('dir', 'rtl');
    } else {
      const html = document.querySelector('html');
      html.setAttribute('dir', 'ltr');
    }
    dispatch(changeDirectionMode(rtlMode));
  };

  return (
    <>
      <CustomizerWrap className="">
        <Link
          className="ninjadash-customizer-btn"
          to="#"
          onClick={() => {
            showCustomizer();
          }}
        >
          <UilPen />
          <span className="ninjadash-customizer-btn__text">{t('Customize')}...</span>
        </Link>
        <div className={customizerAction ? 'ninjadash-customizer-wrapper show' : 'ninjadash-customizer-wrapper'}>
          <div className="ninjadash-customizer">
            <div className="ninjadash-customizer__head">
              <h4 className="ninjadash-customizer__title">{t('Customizer')}</h4>
              <span className="ninjadash-customizer__sub-title">
                {t('Customize')} {t('your')} {t('overview')} {t('page')} {t('layout')}
              </span>
              <Link
                to="#"
                className="ninjadash-customizer-close"
                onClick={() => {
                  showCustomizer();
                }}
              >
                <UilTimes />
              </Link>
            </div>
            <div className="ninjadash-customizer__body">
              <div className="ninjadash-customizer__single">
                <h4>
                  {t('layouts')} {t('type')}
                </h4>
                <ul className="ninjadash-customizer-list d-flex">
                  <li className="ninjadash-customizer-list__item">
                    <Link
                      className={!rtl ? 'active' : 'deactivate'}
                      onClick={() => {
                        showCustomizer();
                        changeLayoutDirection(false);
                      }}
                      to="#"
                    >
                      <img src={require('../../static/img/ltr.png')} alt="" />
                      <FontAwesome name="check-circle" />
                    </Link>
                  </li>
                  <li className="ninjadash-customizer-list__item">
                    <Link
                      className={rtl ? 'active' : 'deactivate'}
                      onClick={() => {
                        showCustomizer();
                        changeLayoutDirection(true);
                      }}
                      to="#"
                    >
                      <img src={require(`../../static/img/rtl.png`)} alt="" />
                      <FontAwesome name="check-circle" />
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="ninjadash-customizer__single">
                <h4>
                  {t('sidebar')} {t('type')}
                </h4>
                <ul className="ninjadash-customizer-list d-flex">
                  <li className="ninjadash-customizer-list__item">
                    <Link
                      className={layoutMode === 'lightMode' ? 'active' : 'deactivate'}
                      onClick={() => {
                        showCustomizer();
                        darkmodeDiactivated();
                        changeLayout('lightMode');
                      }}
                      to="#"
                    >
                      <img src={require('../../static/img/light.png')} alt="" />
                      <FontAwesome name="check-circle" />
                    </Link>
                  </li>
                  <li className="ninjadash-customizer-list__item">
                    <Link
                      className={layoutMode === 'darkMode' ? 'active' : 'deactivate'}
                      onClick={() => {
                        showCustomizer();
                        darkmodeActivated();
                        changeLayout('darkMode');
                      }}
                      to="#"
                    >
                      <img src={require(`../../static/img/dark.png`)} alt="" />
                      <FontAwesome name="check-circle" />
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="ninjadash-customizer__single">
                <h4>
                  {t('navbar')} {t('type')}
                </h4>
                <ul className="ninjadash-customizer-list d-flex">
                  <li className="ninjadash-customizer-list__item">
                    <Link
                      className={!topMenu ? 'active' : 'deactivate'}
                      onClick={() => {
                        showCustomizer();
                        changeNavbar(false);
                      }}
                      to="#"
                    >
                      <img src={require('../../static/img/side.png')} alt="" />
                      <FontAwesome name="check-circle" />
                    </Link>
                  </li>
                  <li className="ninjadash-customizer-list__item top">
                    <Link
                      className={topMenu ? 'active' : 'deactivate'}
                      onClick={() => {
                        showCustomizer();
                        changeNavbar(true);
                      }}
                      to="#"
                    >
                      <img src={require(`../../static/img/top.png`)} alt="" />
                      <FontAwesome name="check-circle" />
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CustomizerWrap>

      <span
        className={customizerAction ? 'overlay-dark show' : 'overlay-dark'}
        onClick={() => {
          showCustomizer();
        }}
      />
    </>
  );
}

export default Customizer;
