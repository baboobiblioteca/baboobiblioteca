import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import { ProtectedRoute, AdminRoute, Login } from './components/Login';
import Layout from './components/Layout';

// Pages
import Home from './pages/Home';
import Sectors from './pages/Sectors';
import Schools from './pages/Schools';
import Pavilions from './pages/Pavilions';
import Backpacks from './pages/Backpacks';
import Transactions from './pages/Transactions';
import Users from './pages/Users';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Protegidas que usan el Layout principal */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/sectors" element={<Sectors />} />
            <Route path="/schools" element={<Schools />} />
            <Route path="/pavilions" element={<Pavilions />} />
            <Route path="/backpacks" element={<Backpacks />} />
            <Route path="/transactions" element={<Transactions />} />
            
            {/* Solo Admin */}
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
