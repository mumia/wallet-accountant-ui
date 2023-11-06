import React from 'react';
// import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { DevSupport } from '@react-buddy/ide-toolbox';
import App from './App';
import './i18n/config';
import reportWebVitals from './reportWebVitals';
import { ComponentPreviews, useInitial } from './dev';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DevSupport ComponentPreviews={ComponentPreviews} useInitialHook={useInitial}>
      <App />
    </DevSupport>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
