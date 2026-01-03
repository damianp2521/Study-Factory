import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="container">
      <main className="page-transition">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
