import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import UploadPage from './UploadPage';
import Dashboard from './Dashboard';

function Navigation() {
  const location = useLocation();
  return (
    <div className="nav-bar">
      <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>رفع تكليف (طالب)</Link>
      <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>لوحة التحكم (المعلم)</Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
