import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Trash, Edit2, Plus, Save, X } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [password, setPassword] = useState('');
    
    const [editingId, setEditingId] = useState(null);
    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await fetchWithAuth('/api/users');
            setUsers(await res.json());
        } catch (e) {
            console.error(e);
        }
    }
    
    const resetForm = () => {
        setNombre('');
        setTelefono('');
        setPassword('');
        setEditingId(null);
    }
    
    const handleEditClick = (u) => {
        setEditingId(u.id);
        setNombre(u.nombre);
        setTelefono(u.telefono || '');
        setPassword(''); // Always reset password field on edit
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    const handleDelete = async (id) => {
        if (id === 1) {
            alert('No se puede eliminar la cuenta principal de administrador.');
            return;
        }
        if(!window.confirm('¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Usuario eliminado correctamente');
                loadData();
            } else {
                const data = await res.json();
                showToast(data.error || 'Error al eliminar usuario', 'error');
            }
        } catch(e) {
             console.error(e);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingId) {
                // For edit, password is only sent if the user typed a new one
                const body = { nombre, telefono };
                if (password) body.password = password;
                
                res = await fetchWithAuth(`/api/users/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(body)
                });
            } else {
                res = await fetchWithAuth('/api/users', {
                    method: 'POST',
                    body: JSON.stringify({ nombre, telefono, password })
                });
            }
            
            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || 'Error al procesar', 'error');
                return;
            }
            
            showToast(editingId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
            resetForm();
            loadData();
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div>
            <div className="card" style={{borderTop: '4px solid var(--primary-color)'}}>
                 <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h2 className="card-title" style={{margin: 0, border: 'none', padding: 0}}>
                        {editingId ? 'Editando Usuario' : 'Crear Nuevo Usuario (Solo Admin)'}
                    </h2>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="btn btn-secondary">
                            <X size={16}/> Cancelar Edición
                        </button>
                    )}
                </div>
                {/* Formulario Inline (Grid) */}
                <form onSubmit={handleSubmit} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end'}}>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Nombre/Usuario</label>
                        <input className="form-control" placeholder="Ej. Juan Perez" value={nombre} onChange={e => setNombre(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Teléfono</label>
                        <input className="form-control" placeholder="Ej. 099999999" value={telefono} onChange={e => setTelefono(e.target.value)} />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Contraseña {editingId && <small style={{fontWeight: 'normal'}}>(Dejar en blanco para conservar actual)</small>}</label>
                        <input type="password" placeholder={editingId ? "********" : "Ingrese contraseña"} className="form-control" value={password} onChange={e => setPassword(e.target.value)} required={!editingId} />
                    </div>
                    <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
                        <button type="submit" className="btn btn-primary btn-block">
                             {editingId ? <><Save size={18}/> Actualizar Usuario</> : <><Plus size={18}/> Crear Usuario</>}
                        </button>
                    </div>
                </form>
            </div>

            <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Usuarios en el Sistema (Modo Tabla)</h3>
            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                        <tr>
                            <th style={{padding: '12px', textAlign: 'center', width: '60px'}}>ID</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Nombre de Usuario</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Teléfono</th>
                            <th style={{padding: '12px', textAlign: 'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                <td style={{padding: '12px', textAlign: 'center', fontWeight: 'bold'}}>{u.id}</td>
                                <td style={{padding: '12px'}}>{u.nombre} {u.id === 1 && <span className="badge badge-blue">Admin</span>}</td>
                                <td style={{padding: '12px'}}>{u.telefono || '-'}</td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                        <button onClick={() => handleEditClick(u)} className="btn btn-secondary" style={{padding: '6px 10px'}} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(u.id)} className="btn btn-danger" title="Eliminar" disabled={u.id === 1} style={u.id === 1 ? {opacity: 0.5, cursor: 'not-allowed', padding: '6px 10px'} : {padding: '6px 10px'}}>
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && <div style={{padding: '20px', textAlign: 'center', background: 'white', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'}}>No hay usuarios registrados.</div>}
            </div>
        </div>
    );
};

export default Users;
