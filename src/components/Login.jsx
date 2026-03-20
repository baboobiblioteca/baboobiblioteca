import React, { useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import babboLogo from '../assets/logo.png';

export const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    if (loading) return <div>Cargando...</div>;
    return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export const AdminRoute = () => {
    const { user, loading } = useAuth();
    if (loading) return <div>Cargando...</div>;
    
    // Simplification for MVP: First User ID 1 is the Admin.
    return (user && user.id === 1) ? <Outlet /> : <Navigate to="/" replace />;
}

export const Login = () => {
    const [nombre, setNombre] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(nombre, password);
        if(!result.success){
            setError(result.error);
        } else {
            navigate("/");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <img src={babboLogo} alt="Babbo Biblioteca" className="login-logo" />
                <h2 style={{color: 'var(--primary-color)', marginBottom: '20px'}}>Acceso Sistema</h2>
                {error && <div style={{color: 'white', background: 'var(--secondary-color)', padding: '10px', borderRadius: '5px', marginBottom: '15px'}}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{textAlign: 'left'}}>
                        <label>Usuario / Nombre</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={nombre} 
                            onChange={(e) => setNombre(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="form-group" style={{textAlign: 'left'}}>
                        <label>Contraseña</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" style={{marginTop: '20px'}}>Entrar Space</button>
                </form>
            </div>
        </div>
    );
};
