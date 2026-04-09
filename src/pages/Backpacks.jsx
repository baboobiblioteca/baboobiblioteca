import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Trash, Edit2, Plus, Save, X } from 'lucide-react';

const Backpacks = () => {
    const [backpacks, setBackpacks] = useState([]);
    
    const [internalNumber, setInternalNumber] = useState('');
    const [graphicIdentifier, setGraphicIdentifier] = useState('');
    const [color, setColor] = useState('');
    const [bookCount, setBookCount] = useState(10);
    const [imageFile, setImageFile] = useState(null);
    
    const [editingId, setEditingId] = useState(null);
    const fileInputCameraRef = useRef(null);
    const fileInputGalleryRef = useRef(null);    
    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : `http://${window.location.hostname}:3001`);

    const loadData = async () => {
        try {
            const res = await fetchWithAuth('/api/backpacks');
            setBackpacks(await res.json());
        } catch (e) {
            console.error(e);
        }
    }

    const resetForm = () => {
        setInternalNumber(''); 
        setGraphicIdentifier(''); 
        setColor(''); 
        setBookCount(10); 
        setImageFile(null);
        setEditingId(null);
        if(fileInputCameraRef.current) fileInputCameraRef.current.value = '';
        if(fileInputGalleryRef.current) fileInputGalleryRef.current.value = '';
    }

    const handleEditClick = (b) => {
        setEditingId(b.id);
        setInternalNumber(b.internal_number);
        setGraphicIdentifier(b.graphic_identifier);
        setColor(b.color);
        setBookCount(b.book_count);
        setImageFile(null);
        if(fileInputCameraRef.current) fileInputCameraRef.current.value = '';
        if(fileInputGalleryRef.current) fileInputGalleryRef.current.value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const handleDelete = async (id) => {
        if(!window.confirm('¿Está seguro de eliminar este morral? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetchWithAuth(`/api/backpacks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Morral eliminado correctamente');
                loadData();
            } else {
                showToast('Error al eliminar', 'error');
            }
        } catch(e) {
             console.error(e);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Use FormData instead of JSON to support file uploads
        const formData = new FormData();
        formData.append('internal_number', internalNumber);
        formData.append('graphic_identifier', graphicIdentifier);
        formData.append('color', color);
        formData.append('book_count', bookCount);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            let res;
            if (editingId) {
                res = await fetchWithAuth(`/api/backpacks/${editingId}`, {
                    method: 'PUT',
                    body: formData,
                    headers: {} // Omitting Content-Type so browser sets boundary for multipart
                });
            } else {
                res = await fetchWithAuth('/api/backpacks', {
                    method: 'POST',
                    body: formData,
                    headers: {} 
                });
            }
            
            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || 'Error al procesar el morral', 'error');
                return;
            }
            
            showToast(editingId ? 'Morral actualizado correctamente' : 'Morral registrado correctamente');
            resetForm();
            loadData();
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div>
            <div className="card" style={{borderTop: '4px solid var(--accent-color)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h2 className="card-title" style={{margin: 0, border: 'none', padding: 0}}>
                        {editingId ? 'Editando Morral' : 'Inventario de Morrales Viajeros'}
                    </h2>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="btn btn-secondary">
                            <X size={16}/> Cancelar Edición
                        </button>
                    )}
                </div>
                
                {/* Formulario en línea Tipo Grid para Ingreso/Edición */}
                <form onSubmit={handleSubmit} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end'}}>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Identificador</label>
                        <input className="form-control" placeholder="MOCH-001" value={internalNumber} onChange={e => setInternalNumber(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Animal</label>
                        <input className="form-control" placeholder="León" value={graphicIdentifier} onChange={e => setGraphicIdentifier(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Color</label>
                        <input type="text" className="form-control" placeholder="Azul" value={color} onChange={e => setColor(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Cant. Libros</label>
                        <input type="number" min="1" className="form-control" value={bookCount} onChange={e => setBookCount(parseInt(e.target.value))} required />
                    </div>
                    <div className="form-group" style={{marginBottom: 0, gridColumn: '1 / -1', display: 'flex', flexDirection: 'column'}}>
                        <label>Foto del Morral / Animal</label>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                            {editingId && backpacks.find(b => b.id === editingId)?.image_url && (
                                <img 
                                    src={backpacks.find(b => b.id === editingId).image_url.startsWith('http') ? backpacks.find(b => b.id === editingId).image_url : `${API_URL}${backpacks.find(b => b.id === editingId).image_url}`} 
                                    alt="Actual" 
                                    style={{height: '40px', width: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc'}} 
                                    title="Imagen actual"
                                />
                            )}
                            <div style={{display: 'flex', gap: '5px', flex: 1, flexDirection: 'column'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                    <span style={{fontSize: '0.8rem', width: '50px'}}>Cámara:</span>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        capture="environment"
                                        className="form-control" 
                                        onChange={e => {
                                            setImageFile(e.target.files[0]);
                                            if(fileInputGalleryRef.current) fileInputGalleryRef.current.value = '';
                                        }} 
                                        ref={fileInputCameraRef}
                                        style={{flex: 1, padding: '4px'}}
                                    />
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                    <span style={{fontSize: '0.8rem', width: '50px'}}>Galería:</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="form-control" 
                                        onChange={e => {
                                            setImageFile(e.target.files[0]);
                                            if(fileInputCameraRef.current) fileInputCameraRef.current.value = '';
                                        }} 
                                        ref={fileInputGalleryRef}
                                        style={{flex: 1, padding: '4px'}}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
                        <button type="submit" className="btn btn-primary btn-block">
                            {editingId ? <><Save size={18}/> Actualizar Morral</> : <><Plus size={18}/> Agregar Morral</>}
                        </button>
                    </div>
                </form>
            </div>

            <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Registros de Morrales (Modo Tabla)</h3>
            
            {/* Visualización Data Grid Tradition (Tabular) */}
            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                        <tr>
                            <th style={{padding: '12px', textAlign: 'center', width: '80px'}}>Foto</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Identificador</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Animal</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Color</th>
                            <th style={{padding: '12px', textAlign: 'center'}}>Libros</th>
                            <th style={{padding: '12px', textAlign: 'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {backpacks.map(b => (
                            <tr key={b.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                <td style={{padding: '8px', textAlign: 'center'}}>
                                    {b.image_url ? (
                                        <img src={b.image_url.startsWith('http') ? b.image_url : `${API_URL}${b.image_url}`} alt="Morral" style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc'}} />
                                    ) : (
                                        <div style={{width: '60px', height: '60px', background: '#eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#999', margin: '0 auto'}}>N/A</div>
                                    )}
                                </td>
                                <td style={{padding: '12px', fontWeight: 'bold'}}>{b.internal_number}</td>
                                <td style={{padding: '12px'}}>{b.graphic_identifier}</td>
                                <td style={{padding: '12px'}}>{b.color}</td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <span className="badge badge-gray">{b.book_count}</span>
                                </td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                        <button onClick={() => handleEditClick(b)} className="btn btn-secondary" style={{padding: '6px 10px'}} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(b.id)} className="btn btn-danger" style={{padding: '6px 10px'}} title="Eliminar">
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {backpacks.length === 0 && <div style={{padding: '20px', textAlign: 'center', background: 'white', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'}}>No hay morrales registrados en el sistema.</div>}
            </div>
        </div>
    );
};

export default Backpacks;
