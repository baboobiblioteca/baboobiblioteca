import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Home, Users, Layers, Map, Backpack, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import babboLogo from '../assets/logo.png';

const Layout = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="app-container">
      <header className="header">
        <Link to="/" className="header-logo" style={{textDecoration: 'none', color: 'inherit'}}>
          <img src={babboLogo} alt="Logo" />
          <h1>Babbo Biblioteca</h1>
        </Link>
        
        <button className="mobile-menu-btn" onClick={toggleMenu}>
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
        
        <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/')}`} onClick={() => setMenuOpen(false)}>
             <Home size={18}/> Inicio
          </Link>
          <Link to="/transactions" className={`nav-link ${isActive('/transactions')}`} onClick={() => setMenuOpen(false)}>
             <ArrowRightLeft size={18}/> Entregas
          </Link>
          <Link to="/backpacks" className={`nav-link ${isActive('/backpacks')}`} onClick={() => setMenuOpen(false)}>
             <Backpack size={18}/> Mochilas
          </Link>
          <Link to="/sectors" className={`nav-link ${isActive('/sectors')}`} onClick={() => setMenuOpen(false)}>
             <Map size={18}/> Colegios
          </Link>
          <Link to="/schools" className={`nav-link ${isActive('/schools')}`} onClick={() => setMenuOpen(false)}>
             <Layers size={18}/> Escuelas
          </Link>
          <Link to="/pavilions" className={`nav-link ${isActive('/pavilions')}`} onClick={() => setMenuOpen(false)}>
             <Layers size={18}/> Niveles
          </Link>
          
          {user && user.id === 1 && (
              <Link to="/users" className={`nav-link ${isActive('/users')}`} onClick={() => setMenuOpen(false)}>
                <Users size={18}/> Usuarios
              </Link>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Hola, {user?.nombre}</span>
            <button onClick={logout} className="nav-link" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
               <LogOut size={18}/> Salir
            </button>
          </div>
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
