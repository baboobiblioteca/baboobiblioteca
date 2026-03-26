import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Trash, Edit2, Plus, Save, X } from 'lucide-react';

const Pavilions = () => {
    const [pavilions, setPavilions] = useState([]);
    const [schools, setSchools] = useState([]);
    
    const [nombre, setNombre] = useState('');
    const [schoolId, setSchoolId] = useState('');
    const [teacherName, setTeacherName] = useState('');
    const [teacherPhone, setTeacherPhone] = useState('');
    const [studentCount, setStudentCount] = useState(0);
    const [editingId, setEditingId] = useState(null);
    
    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [resPav, resSchools] = await Promise.all([
                fetchWithAuth('/api/pavilions'),
                fetchWithAuth('/api/schools')
            ]);
            setPavilions(await resPav.json());
            setSchools(await resSchools.json());
        } catch (e) {
            console.error(e);
        }
    }

    const resetForm = () => {
        setNombre('');
        setSchoolId('');
        setTeacherName('');
        setTeacherPhone('');
        setStudentCount(0);
        setEditingId(null);
    };

    const handleEditClick = (p) => {
        setEditingId(p.id);
        setNombre(p.nombre);
        setSchoolId(p.school_id);
        setTeacherName(p.teacher_name);
        setTeacherPhone(p.teacher_phone || '');
        setStudentCount(p.student_count);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if(!window.confirm('¿Está seguro de eliminar este nivel?')) return;
        try {
            const res = await fetchWithAuth(`/api/pavilions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Nivel eliminado correctamente');
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
            if (editingId) {
                res = await fetchWithAuth(`/api/pavilions/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ school_id: schoolId, nombre, teacher_name: teacherName, teacher_phone: teacherPhone, student_count: studentCount })
                });
            } else {
                res = await fetchWithAuth('/api/pavilions', {
                    method: 'POST',
                    body: JSON.stringify({ school_id: schoolId, nombre, teacher_name: teacherName, teacher_phone: teacherPhone, student_count: studentCount })
                });
            }
            
            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || 'Error al procesar', 'error');
                return;
            }
            showToast(editingId ? 'Nivel actualizado correctamente' : 'Nivel registrado correctamente');
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
                        {editingId ? 'Editando Nivel' : 'Mantenimiento de Niveles'}
                    </h2>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="btn btn-secondary">
                            <X size={16}/> Cancelar Edición
                        </button>
                    )}
                </div>
                <form onSubmit={handleSubmit} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'flex-end'}}>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Escuela</label>
                        <select className="form-control" value={schoolId} onChange={e => setSchoolId(e.target.value)} required>
                            <option value="">-- Seleccione Escuela --</option>
                            {schools.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.sector_nombre})</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Nombre/Grado del Nivel</label>
                        <input className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Profesor Responsable</label>
                        <input className="form-control" value={teacherName} onChange={e => setTeacherName(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Celular</label>
                        <input className="form-control" value={teacherPhone} onChange={e => setTeacherPhone(e.target.value)} />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Cant. Alumnos</label>
                        <input type="number" min="0" className="form-control" value={studentCount} onChange={e => setStudentCount(parseInt(e.target.value))} required />
                    </div>
                    <div style={{gridColumn: '1 / -1'}}>
                        <button type="submit" className="btn btn-primary btn-block">
                            {editingId ? <><Save size={18}/> Actualizar Nivel</> : <><Plus size={18}/> Registrar Nivel</>}
                        </button>
                    </div>
                </form>
            </div>

            <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Niveles Registrados (Modo Tabla)</h3>
            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                        <tr>
                            <th style={{padding: '12px', textAlign: 'left'}}>Escuela</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Nivel</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Profesor</th>
                            <th style={{padding: '12px', textAlign: 'center'}}>Celular</th>
                            <th style={{padding: '12px', textAlign: 'center'}}>Alumnos</th>
                            <th style={{padding: '12px', textAlign: 'center', width: '120px'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pavilions.map(p => (
                            <tr key={p.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                <td style={{padding: '12px', color: 'var(--text-muted)'}}>{p.school_nombre}</td>
                                <td style={{padding: '12px', fontWeight: 'bold'}}>{p.nombre}</td>
                                <td style={{padding: '12px'}}>{p.teacher_name}</td>
                                <td style={{padding: '12px', textAlign: 'center'}}>{p.teacher_phone || '-'}</td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <span className="badge badge-orange">{p.student_count}</span>
                                </td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                        <button onClick={() => handleEditClick(p)} className="btn btn-secondary" style={{padding: '6px 10px'}} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(p.id)} className="btn btn-danger" style={{padding: '6px 10px'}} title="Eliminar">
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pavilions.length === 0 && <div style={{padding: '20px', textAlign: 'center', background: 'white', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'}}>No hay niveles registrados.</div>}
            </div>
        </div>
    );
};

export default Pavilions;
