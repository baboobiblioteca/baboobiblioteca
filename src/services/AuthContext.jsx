import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists on load
    const token = localStorage.getItem('babboToken');
    const storedUser = localStorage.getItem('babboUser');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : `http://${window.location.hostname}:3001`);

  const login = async (nombre, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('babboToken', data.token);
        localStorage.setItem('babboUser', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
       console.error("Login error", error);
       return { success: false, error: 'Error de conexión con el servidor' };
    }
  };

  const logout = () => {
    localStorage.removeItem('babboToken');
    localStorage.removeItem('babboUser');
    setUser(null);
  };

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('babboToken');
    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // Agregar Content-Type si estamos mandando JSON text directamente. 
    // Para form-data, dejamos que fetch y el navegador actuen libremente.
    if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }
    
    const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : `http://${window.location.hostname}:3001`);
    
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers
    });
    
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Su sesión ha expirado.");
    }
    
    return response;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
