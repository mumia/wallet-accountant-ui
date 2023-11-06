import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Dashboard from '../../container/pages/Dashboard';
import Accounts from '../../container/pages/Accounts';
import Movements from '../../container/pages/Movement';

// const BlankPage = lazy(() => import('../../container/pages/Dashboard'));

function PagesRoute() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="accounts" element={<Accounts />} />
      <Route path="movements" element={<Movements />} />
    </Routes>
  );
}

export default PagesRoute;
