import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { Trash, Edit2, Plus, Save, X } from 'lucide-react';

const Sectors = () => {
    const [sectors, setSectors] = useState([]);
    const [nombre, setNombre] = useState('');
    const [editingId, setEditingId] = useState(null);
    const { fetchWithAuth } = useAuth();
    
    useEffect(() => {
        loadSectors();
    }, []);

    const loadSectors = async () => {
        try {
            const res = await fetchWithAuth('/api/sectors');
            const data = await res.json();
            setSectors(data);
        } catch (e) {
            console.error(e);
        }
    };

    const resetForm = () => {
        setNombre('');
        setEditingId(null);
    };

    const handleEditClick = (sector) => {
        setEditingId(sector.id);
        setNombre(sector.nombre);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if(!window.confirm('¿Está seguro de eliminar este colegio? Tenga cuidado con los registros vinculados.')) return;
        try {
            const res = await fetchWithAuth(`/api/sectors/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadSectors();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al eliminar');
            }
        } catch(e) {
             console.error(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingId) {
                res = await fetchWithAuth(`/api/sectors/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ nombre })
                });
            } else {
                res = await fetchWithAuth('/api/sectors', {
                    method: 'POST',
                    body: JSON.stringify({ nombre })
                });
            }
            
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al procesar la solicitud');
                return;
            }
            
            resetForm();
            loadSectors();
        } catch (e) {
            console.error(e);
            alert("Error de conexión");
        }
    }

    return (
        <div>
            <div className="card" style={{borderTop: '4px solid var(--primary-color)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h2 className="card-title" style={{margin: 0, border: 'none', padding: 0}}>
                        {editingId ? 'Editando Colegio' : 'Agregar Colegio'}
                    </h2>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="btn btn-secondary">
                            <X size={16}/> Cancelar Edición
                        </button>
                    )}
                </div>
                <form onSubmit={handleSubmit} style={{display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                    <div className="form-group" style={{flex: 1, marginBottom: 0}}>
                        <label>Nombre del Colegio</label>
                        <input 
                            type="text" 
                            className="form-control"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{marginBottom: 0}}>
                        {editingId ? <><Save size={18}/> Actualizar</> : <><Plus size={18}/> Guardar</>}
                    </button>
                </form>
            </div>

            <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Colegios Registrados (Modo Tabla)</h3>
            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                        <tr>
                            <th style={{padding: '12px', textAlign: 'center', width: '80px'}}>ID</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Nombre del Colegio</th>
                            <th style={{padding: '12px', textAlign: 'center', width: '120px'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sectors.map(sector => (
                            <tr key={sector.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                <td style={{padding: '12px', textAlign: 'center', fontWeight: 'bold'}}>{sector.id}</td>
                                <td style={{padding: '12px'}}>{sector.nombre}</td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                        <button onClick={() => handleEditClick(sector)} className="btn btn-secondary" style={{padding: '6px 10px'}} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(sector.id)} className="btn btn-danger" style={{padding: '6px 10px'}} title="Eliminar">
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sectors.length === 0 && <div style={{padding: '20px', textAlign: 'center', background: 'white', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'}}>No hay colegios registrados.</div>}
            </div>
        </div>
    );
}

export default Sectors;
