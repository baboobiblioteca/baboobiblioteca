import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { BookOpen, Users, MapPin, Truck, Backpack } from 'lucide-react';
import { Link, useNavigate, Navigate } from 'react-router-dom';

const Home = () => {
    const { user, fetchWithAuth, workspaceMode, setWorkspaceMode } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        schools: 0,
        pavilions: 0,
        backpacks: 0,
        activeTransactions: 0
    });

    useEffect(() => {
        if (workspaceMode === 'backpacks') {
            loadData();
        }
    }, [workspaceMode]);

    const loadData = async () => {
        try {
            const [rs, rp, rb, rt] = await Promise.all([
                fetchWithAuth('/api/schools'),
                fetchWithAuth('/api/pavilions'),
                fetchWithAuth('/api/backpacks'),
                fetchWithAuth('/api/transactions')
            ]);
            
            const transData = await rt.json();
            let active = 0;
            const stateMap = {};
            [...transData].reverse().forEach(t => {
                if(t.action === 'Delivered') stateMap[t.backpack_number] = true;
                if(t.action === 'Picked_Up') delete stateMap[t.backpack_number];
            });
            active = Object.keys(stateMap).length;

            setStats({
                schools: (await rs.json()).length,
                pavilions: (await rp.json()).length,
                backpacks: (await rb.json()).length,
                activeTransactions: active
            });
            
        } catch (e) {
            console.error(e);
        }
    };

    if (!workspaceMode) {
        return (
            <div style={{textAlign: 'center', marginTop: '40px'}}>
                <h2 style={{color: 'var(--primary-color)', marginBottom: '40px', fontSize: '2rem'}}>¿Qué área deseas gestionar hoy, {user?.nombre}?</h2>
                <div style={{display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap'}}>
                    
                    <div className="card workspace-card" onClick={() => setWorkspaceMode('backpacks')} 
                        style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', width: '320px', borderTop: '5px solid var(--accent-color)'}}>
                        <div style={{background: 'rgba(52, 152, 219, 0.1)', padding: '25px', borderRadius: '50%', color: 'var(--accent-color)', marginBottom: '20px'}}>
                            <Backpack size={64} />
                        </div>
                        <h3 style={{fontSize: '1.5rem', marginBottom: '10px', color: 'var(--primary-color)'}}>Mochilas Viajeras</h3>
                        <p style={{color: 'var(--text-muted)', margin: 0}}>Control de logística de viajes, escuelas, niveles, mochilas y transacciones en campo.</p>
                    </div>

                    <div className="card workspace-card" onClick={() => { setWorkspaceMode('books'); navigate('/books'); }} 
                        style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', width: '320px', borderTop: '5px solid var(--success-color)'}}>
                        <div style={{background: 'rgba(39, 174, 96, 0.1)', padding: '25px', borderRadius: '50%', color: 'var(--success-color)', marginBottom: '20px'}}>
                            <BookOpen size={64} />
                        </div>
                        <h3 style={{fontSize: '1.5rem', marginBottom: '10px', color: 'var(--primary-color)'}}>Biblioteca Local</h3>
                        <p style={{color: 'var(--text-muted)', margin: 0}}>Gestión del catálogo interno de libros, carga masiva desde Excel y busquedas por ISBN.</p>
                    </div>

                </div>
            </div>
        );
    }

    if (workspaceMode === 'books') {
         return <Navigate to="/books" replace />;
    }

    return (
        <div>
            <h2 style={{marginBottom: '20px', color: 'var(--primary-color)'}}>
                Panel de Mochilas Viajeras
            </h2>
            
            <div style={{
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '20px',
                marginBottom: '40px'
            }}>
                <div className="card" onClick={() => navigate('/schools')} style={{margin: 0, display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid var(--accent-color)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
                    <div style={{background: 'rgba(52, 152, 219, 0.1)', padding: '15px', borderRadius: '50%', color: 'var(--accent-color)'}}>
                        <MapPin size={32} />
                    </div>
                    <div>
                        <h3 style={{fontSize: '2rem', margin: 0}}>{stats.schools}</h3>
                        <p style={{color: 'var(--text-muted)', margin: 0}}>Escuelas</p>
                    </div>
                </div>
                
                <div className="card" onClick={() => navigate('/pavilions')} style={{margin: 0, display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid var(--warning-color)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
                    <div style={{background: 'rgba(243, 156, 18, 0.1)', padding: '15px', borderRadius: '50%', color: 'var(--warning-color)'}}>
                        <Users size={32} />
                    </div>
                    <div>
                        <h3 style={{fontSize: '2rem', margin: 0}}>{stats.pavilions}</h3>
                        <p style={{color: 'var(--text-muted)', margin: 0}}>Niveles</p>
                    </div>
                </div>

                <div className="card" onClick={() => navigate('/backpacks')} style={{margin: 0, display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid var(--success-color)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
                    <div style={{background: 'rgba(39, 174, 96, 0.1)', padding: '15px', borderRadius: '50%', color: 'var(--success-color)'}}>
                        <Backpack size={32} />
                    </div>
                    <div>
                        <h3 style={{fontSize: '2rem', margin: 0}}>{stats.backpacks}</h3>
                        <p style={{color: 'var(--text-muted)', margin: 0}}>Mochilas Registradas</p>
                    </div>
                </div>

                <div className="card" onClick={() => navigate('/transactions')} style={{margin: 0, display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid var(--secondary-color)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
                    <div style={{background: 'rgba(231, 76, 60, 0.1)', padding: '15px', borderRadius: '50%', color: 'var(--secondary-color)'}}>
                        <Truck size={32} />
                    </div>
                    <div>
                        <h3 style={{fontSize: '2rem', margin: 0}}>{stats.activeTransactions}</h3>
                        <p style={{color: 'var(--text-muted)', margin: 0}}>Mochilas en Campo</p>
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 className="card-title">Acciones Rápidas</h3>
                <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                    <Link to="/transactions" className="btn btn-primary">Registrar Entrega / Recogida</Link>
                    <Link to="/backpacks" className="btn btn-secondary">Añadir Nueva Mochila</Link>
                </div>
            </div>
        </div>
    );
};

export default Home;
