import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Trash, Edit2, Plus, Save, X } from 'lucide-react';

const Schools = () => {
    const [schools, setSchools] = useState([]);
    const [sectors, setSectors] = useState([]);
    
    const [nombre, setNombre] = useState('');
    const [sectorId, setSectorId] = useState('');
    const [type, setType] = useState('Urbana');
    const [editingId, setEditingId] = useState(null);
    
    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [resSchools, resSectors] = await Promise.all([
                fetchWithAuth('/api/schools'),
                fetchWithAuth('/api/sectors')
            ]);
            setSchools(await resSchools.json());
            setSectors(await resSectors.json());
        } catch (e) {
            console.error(e);
        }
    }

    const resetForm = () => {
        setNombre('');
        setSectorId('');
        setType('Urbana');
        setEditingId(null);
    };

    const handleEditClick = (school) => {
        setEditingId(school.id);
        setNombre(school.nombre);
        setSectorId(school.sector_id);
        setType(school.type);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if(!window.confirm('¿Está seguro de eliminar esta escuela?')) return;
        try {
            const res = await fetchWithAuth(`/api/schools/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Escuela eliminada correctamente');
                loadData();
            } else {
                const data = await res.json();
                showToast(data.error || 'Error al eliminar', 'error');
            }
        } catch(e) {
             console.error(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if(editingId) {
                res = await fetchWithAuth(`/api/schools/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ sector_id: sectorId, nombre, type })
                });
            } else {
                res = await fetchWithAuth('/api/schools', {
                    method: 'POST',
                    body: JSON.stringify({ sector_id: sectorId, nombre, type })
                });
            }
            
            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || 'Error al procesar', 'error');
                return;
            }
            showToast(editingId ? 'Escuela actualizada correctamente' : 'Escuela registrada correctamente');
            resetForm();
            loadData();
        } catch (e) {
            console.error(e);
            showToast("Error de conexión", 'error');
        }
    }

    return (
        <div>
            <div className="card" style={{borderTop: '4px solid var(--primary-color)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h2 className="card-title" style={{margin: 0, border: 'none', padding: 0}}>
                        {editingId ? 'Editando Escuela' : 'Agregar Escuela'}
                    </h2>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="btn btn-secondary">
                            <X size={16}/> Cancelar Edición
                        </button>
                    )}
                </div>
                <form onSubmit={handleSubmit} style={{display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                    <div className="form-group" style={{flex: 1, marginBottom: 0}}>
                        <label>Colegio</label>
                        <select className="form-control" value={sectorId} onChange={e => setSectorId(e.target.value)} required>
                            <option value="">-- Seleccione un Colegio --</option>
                            {sectors.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{flex: 2, marginBottom: 0}}>
                        <label>Nombre de la Escuela</label>
                        <input className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{flex: 1, marginBottom: 0}}>
                        <label>Tipo (Urbana/Rural)</label>
                        <select className="form-control" value={type} onChange={e => setType(e.target.value)}>
                            <option value="Urbana">Urbana</option>
                            <option value="Rural">Rural</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{marginBottom: 0}}>
                        {editingId ? <><Save size={18}/> Actualizar</> : <><Plus size={18}/> Guardar Escuela</>}
                    </button>
                </form>
            </div>

            <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Escuelas Registradas (Modo Tabla)</h3>
            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                        <tr>
                            <th style={{padding: '12px', textAlign: 'left'}}>Colegio</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Escuela</th>
                            <th style={{padding: '12px', textAlign: 'center'}}>Tipo</th>
                            <th style={{padding: '12px', textAlign: 'center', width: '120px'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schools.map(school => (
                            <tr key={school.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                <td style={{padding: '12px', color: 'var(--text-muted)'}}>{school.sector_nombre}</td>
                                <td style={{padding: '12px', fontWeight: 'bold'}}>{school.nombre}</td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <span className={`badge ${school.type === 'Rural' ? 'badge-green' : 'badge-blue'}`}>
                                        {school.type}
                                    </span>
                                </td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                        <button onClick={() => handleEditClick(school)} className="btn btn-secondary" style={{padding: '6px 10px'}} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(school.id)} className="btn btn-danger" style={{padding: '6px 10px'}} title="Eliminar">
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {schools.length === 0 && <div style={{padding: '20px', textAlign: 'center', background: 'white', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'}}>No hay escuelas registradas.</div>}
            </div>
        </div>
    );
};

export default Schools;
