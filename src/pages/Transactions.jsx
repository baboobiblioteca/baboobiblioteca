import React, { useState, useEffect, Component } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Package, Truck, CheckCircle, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

class TransactionErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{padding: '20px', backgroundColor: '#ffecec', border: '1px solid red', borderRadius: '8px', marginTop: '20px'}}>
                    <h2 style={{color: 'red'}}>Error Inesperado en Entregas</h2>
                    <p>Por favor copia este error y envíaselo al asistente:</p>
                    <pre style={{whiteSpace: 'pre-wrap', backgroundColor: 'white', padding: '10px', borderRadius: '4px'}}>
                        {this.state.error && this.state.error.toString()}
                        <br/><br/>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [backpacks, setBackpacks] = useState([]);
    const [pavilions, setPavilions] = useState([]);
    const [schools, setSchools] = useState([]);
    const [backpackId, setBackpackId] = useState('');
    const [selectedSchoolId, setSelectedSchoolId] = useState('');
    
    const getLocalDatetime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // Pavilion info for delivery
    const [newPavilionName, setNewPavilionName] = useState('');
    const [newPavilionTeacher, setNewPavilionTeacher] = useState('');
    const [newPavilionPhone, setNewPavilionPhone] = useState('');
    const [newPavilionStudents, setNewPavilionStudents] = useState('');
    const [transactionDate, setTransactionDate] = useState(getLocalDatetime());
    
    // Filter state
    const [filterType, setFilterType] = useState('');
    const [filterSchool, setFilterSchool] = useState('');
    const [filterBackpack, setFilterBackpack] = useState('');
    
    // Edit Modal State
    const [editingTx, setEditingTx] = useState(null);
    const [editBackpackId, setEditBackpackId] = useState('');
    const [editSchoolId, setEditSchoolId] = useState('');
    const [editTransactionDate, setEditTransactionDate] = useState('');
    const [editPavilionName, setEditPavilionName] = useState('');
    const [editPavilionTeacher, setEditPavilionTeacher] = useState('');
    const [editPavilionPhone, setEditPavilionPhone] = useState('');
    const [editPavilionStudents, setEditPavilionStudents] = useState('');
    
    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [resTx, resB, resP, resS] = await Promise.all([
                fetchWithAuth('/api/transactions'),
                fetchWithAuth('/api/backpacks'),
                fetchWithAuth('/api/pavilions'),
                fetchWithAuth('/api/schools')
            ]);
            const txData = await resTx.json();
            const bData = await resB.json();
            const pData = await resP.json();
            const sData = await resS.json();
            
            setTransactions(Array.isArray(txData) ? txData : []);
            setBackpacks(Array.isArray(bData) ? bData : []);
            setPavilions(Array.isArray(pData) ? pData : []);
            setSchools(Array.isArray(sData) ? sData : []);
        } catch (e) {
            console.error(e);
        }
    }

    const handleDeliver = async (e) => {
        e.preventDefault();
        try {
            let finalPavilionId = null;

            // Verificar si el profesor ya existe en niveles para esa escuela
            const existingPavilion = pavilions.find(p => 
                p.school_id === parseInt(selectedSchoolId) && 
                p.teacher_name && 
                p.teacher_name.toLowerCase().trim() === newPavilionTeacher.toLowerCase().trim()
            );

            if (existingPavilion) {
                finalPavilionId = existingPavilion.id;
            } else {
                // Primero creamos el nivel / pabellón si no existe
                const resPav = await fetchWithAuth('/api/pavilions', {
                    method: 'POST',
                    body: JSON.stringify({
                        school_id: selectedSchoolId,
                        nombre: newPavilionName,
                        teacher_name: newPavilionTeacher,
                        teacher_phone: newPavilionPhone,
                        student_count: parseInt(newPavilionStudents) || 0
                    })
                });
                
                if (resPav.ok) {
                    const pavilionData = await resPav.json();
                    finalPavilionId = pavilionData.id;
                } else {
                    alert("Error al registrar la información del nivel/profesor");
                    return;
                }
            }

            // Luego registramos la transacción usando el ID del nivel
            const formattedDate = transactionDate.replace('T', ' ') + ':00';
            const resTx = await fetchWithAuth('/api/transactions', {
                method: 'POST',
                body: JSON.stringify({ 
                    backpack_id: backpackId, 
                    pavilion_id: finalPavilionId, 
                    action: 'Delivered',
                    transaction_date: formattedDate
                })
            });
            
            if (!resTx.ok) {
                const errData = await resTx.json().catch(() => ({}));
                showToast("Error al registrar: " + (errData.error || resTx.statusText), 'error');
                return;
            }

            showToast('Entrega registrada correctamente');
            
            // Reseteamos el formulario
            setBackpackId(''); 
            setSelectedSchoolId('');
            setNewPavilionName('');
            setNewPavilionTeacher('');
            setNewPavilionPhone('');
            setNewPavilionStudents('');
            setTransactionDate(getLocalDatetime());
            
            loadData();
        } catch (e) {
            console.error(e);
        }
    }

    const handleTeacherChange = (e) => {
        const val = e.target.value;
        setNewPavilionTeacher(val);
        
        // Auto-fill cel and grado if a teacher is matched in any existing level
        if (val.trim().length > 2) {
            const existing = pavilions.find(p => p.teacher_name && p.teacher_name.toLowerCase() === val.toLowerCase().trim());
            if (existing) {
                // Siempre actualizamos si se encuentra el profesor
                setNewPavilionPhone(existing.teacher_phone || '');
                setNewPavilionName(existing.nombre || '');
                setNewPavilionStudents(existing.student_count || '');
            }
        }
    };

    const handlePickup = async (tx) => {
        if(!window.confirm(`¿Confirmar recogida del morral ${tx.backpack_number} del aula ${tx.pavilion_nombre}?`)) return;
        
        try {
            const formattedDate = getLocalDatetime().replace('T', ' ') + ':00';
            const resTx = await fetchWithAuth('/api/transactions', {
                method: 'POST',
                body: JSON.stringify({ 
                    backpack_id: tx.backpack_id || backpacks.find(b => b.internal_number === tx.backpack_number)?.id,
                    pavilion_id: tx.pavilion_id, 
                    action: 'Picked_Up',
                    transaction_date: formattedDate
                })
            });
            if (!resTx.ok) {
                const errData = await resTx.json().catch(() => ({}));
                showToast("Error al registrar recogida: " + (errData.error || resTx.statusText), 'error');
                return;
            }
            showToast('Recogida registrada correctamente');
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditClick = (tx) => {
        const pav = pavilions.find(p => p.id === tx.pavilion_id);
        const sId = pav ? pav.school_id : '';
        
        setEditingTx(tx.id);
        setEditBackpackId(tx.backpack_id || '');
        setEditSchoolId(sId);
        setEditTransactionDate(tx.transaction_date ? tx.transaction_date.replace(' ', 'T') : getLocalDatetime());
        setEditPavilionName(tx.pavilion_nombre || '');
        setEditPavilionTeacher(tx.teacher_nombre || '');
        setEditPavilionPhone(tx.teacher_phone || '');
        setEditPavilionStudents(pav ? pav.student_count : '');
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            let finalPavilionId = null;

            const existingPavilion = pavilions.find(p => 
                p.school_id === parseInt(editSchoolId) && 
                p.teacher_name && 
                p.teacher_name.toLowerCase().trim() === editPavilionTeacher.toLowerCase().trim()
            );

            if (existingPavilion) {
                finalPavilionId = existingPavilion.id;
            } else {
                const resPav = await fetchWithAuth('/api/pavilions', {
                    method: 'POST',
                    body: JSON.stringify({
                        school_id: editSchoolId,
                        nombre: editPavilionName,
                        teacher_name: editPavilionTeacher,
                        teacher_phone: editPavilionPhone,
                        student_count: parseInt(editPavilionStudents) || 0
                    })
                });
                if (resPav.ok) {
                    const data = await resPav.json();
                    finalPavilionId = data.id;
                } else {
                    alert("Error al actualizar la información del nivel/profesor");
                    return;
                }
            }

            const formattedDate = editTransactionDate.replace('T', ' ') + ':00';
            const originalTx = transactions.find(t => t.id === editingTx);
            
            const resTx = await fetchWithAuth(`/api/transactions/${editingTx}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    backpack_id: editBackpackId, 
                    pavilion_id: finalPavilionId, 
                    action: originalTx.action,
                    transaction_date: formattedDate
                })
            });
            if (!resTx.ok) {
                const errData = await resTx.json().catch(() => ({}));
                showToast("Error al actualizar: " + (errData.error || resTx.statusText), 'error');
                return;
            }
            showToast('Actualización realizada correctamente');
            
            setEditingTx(null);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este movimiento? Esta acción no se puede deshacer.")) return;
        try {
            const res = await fetchWithAuth(`/api/transactions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Eliminación realizada correctamente');
                loadData();
            } else {
                showToast('Error al eliminar', 'error');
            }
        } catch(e) { console.error(e); }
    };

    const handleEditTeacherChange = (e) => {
        const val = e.target.value;
        setEditPavilionTeacher(val);
        if (val.trim().length > 2) {
            const existing = pavilions.find(p => p.teacher_name && p.teacher_name.toLowerCase() === val.toLowerCase().trim());
            if (existing) {
                setEditPavilionPhone(existing.teacher_phone || '');
                setEditPavilionName(existing.nombre || '');
                setEditPavilionStudents(existing.student_count || '');
            }
        }
    };

    // Helper to format SQLite/Postgres timestamp
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        // Evita que el navegador aplique conversión de zonas horarias restando horas
        let ds = String(dateString);
        if (ds.includes('T')) {
            ds = ds.split('T')[0] + ' ' + ds.split('T')[1].substring(0, 5);
        } else {
            ds = ds.substring(0, 16);
        }
        const parts = ds.split(' ');
        if (parts.length !== 2) return dateString;
        const [yyyy, mm, dd] = parts[0].split('-');
        if (!yyyy || !mm || !dd) return dateString;
        const yy = yyyy.slice(-2);
        return `${yy}/${mm}/${dd} ${parts[1]}`;
    }

    const activeDeliveriesMap = {};
    const byBackpack = {};
    transactions.forEach(t => {
        const key = t.backpack_id || t.backpack_number;
        if (key) {
            if (!byBackpack[key]) byBackpack[key] = [];
            byBackpack[key].push(t);
        }
    });

    Object.values(byBackpack).forEach(bpTransactions => {
        bpTransactions.sort((a,b) => {
            const dA = a.transaction_date ? new Date(a.transaction_date.replace(' ', 'T')).getTime() : 0;
            const dB = b.transaction_date ? new Date(b.transaction_date.replace(' ', 'T')).getTime() : 0;
            return dB - dA;
        });

        let pendingPickups = 0;
        for (let t of bpTransactions) {
            if (t.action === 'Picked_Up') {
                pendingPickups++;
            } else if (t.action === 'Delivered') {
                if (pendingPickups > 0) {
                    pendingPickups--;
                } else {
                    activeDeliveriesMap[t.id] = true;
                }
            }
        }
    });

    // Calculate unique values for filters
    const validTransactions = Array.isArray(transactions) ? transactions : [];
    const uniqueSchools = [...new Set(validTransactions.map(t => t.school_nombre).filter(Boolean))].sort();
    const uniqueBackpacks = [...new Set(validTransactions.map(t => t.backpack_number).filter(Boolean))].sort();

    // Filter transactions
    const filteredTransactions = transactions.filter(t => {
        if (filterType && t.action !== filterType) return false;
        if (filterSchool && t.school_nombre !== filterSchool) return false;
        if (filterBackpack && t.backpack_number !== filterBackpack) return false;
        return true;
    }).sort((a, b) => {
        const bpA = a.backpack_number || '';
        const bpB = b.backpack_number || '';
        if (bpA !== bpB) return bpA.localeCompare(bpB, undefined, { numeric: true });
        
        // Secondary sort by absolute date (oldest first) to maintain the exact chronological logic: Entrega -> Recogida -> Entrega -> Recogida
        const dateA = a.transaction_date ? new Date(a.transaction_date.replace(' ', 'T')).getTime() : 0;
        const dateB = b.transaction_date ? new Date(b.transaction_date.replace(' ', 'T')).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        
        // Tertiary sort by action as a fallback tie-breaker if dates are exactly the same (Delivered first)
        const actionA = a.action || '';
        const actionB = b.action || '';
        return actionA.localeCompare(actionB);
    });

    const exportToExcel = () => {
        const dataToExport = filteredTransactions.map(t => ({
            'Fecha': formatDate(t.transaction_date),
            'Acción': t.action === 'Delivered' ? 'Entrega' : 'Recogida',
            'Morral': t.backpack_graphic ? `${t.backpack_number} (${t.backpack_graphic})` : t.backpack_number,
            'Grado/Aula': t.pavilion_nombre || 'N/A',
            'Escuela': t.school_nombre || 'N/A',
            'Profesor': t.teacher_nombre || 'N/A',
            'Celular': t.teacher_phone || 'N/A',
            'Alumnos': t.student_count || 0,
            'Usuario': t.registered_by
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
        XLSX.writeFile(wb, "movimientos.xlsx");
    };

    return (
        <TransactionErrorBoundary>
        <div>
            {/* Edit Modal */}
            {editingTx && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
                    <div className="card" style={{width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', borderTop: '4px solid #f39c12'}}>
                        <h2 className="card-title" style={{display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between'}}>
                            <span><Pencil size={24} /> Editar Movimiento</span>
                            <button onClick={() => setEditingTx(null)} className="btn btn-danger" style={{padding: '5px 10px'}} title="Cerrar">X</button>
                        </h2>
                        <form onSubmit={handleUpdate} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end'}}>
                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Seleccionar Morral</label>
                                <select className="form-control" value={editBackpackId} onChange={e => setEditBackpackId(e.target.value)} required>
                                    <option value="">-- Elige Morral --</option>
                                    {backpacks.map(b => <option key={b.id} value={b.id}>{b.internal_number} ({b.graphic_identifier})</option>)}
                                </select>
                            </div>
                            
                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Seleccionar Escuela</label>
                                <select className="form-control" value={editSchoolId} onChange={e => setEditSchoolId(e.target.value)} required>
                                    <option value="">-- Elige Escuela --</option>
                                    {schools.map(s => <option key={s.id} value={s.id}>{s.nombre} - {s.sector_nombre}</option>)}
                                </select>
                            </div>

                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Fecha y Hora</label>
                                <input type="datetime-local" className="form-control" value={editTransactionDate} onChange={e => setEditTransactionDate(e.target.value)} required />
                            </div>

                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Nombre del Profesor</label>
                                <input 
                                    className="form-control" 
                                    value={editPavilionTeacher} 
                                    onChange={handleEditTeacherChange} 
                                    required 
                                    list="edit-teacher-list"
                                />
                                <datalist id="edit-teacher-list">
                                    {[...new Set((Array.isArray(pavilions) ? pavilions : []).map(p => p.teacher_name).filter(Boolean))].map(t => (
                                        <option key={t} value={t} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Celular</label>
                                <input className="form-control" value={editPavilionPhone} onChange={e => setEditPavilionPhone(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Grado / Aula</label>
                                <input className="form-control" value={editPavilionName} onChange={e => setEditPavilionName(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Cant. de Alumnos</label>
                                <input type="number" min="0" className="form-control" value={editPavilionStudents} onChange={e => setEditPavilionStudents(e.target.value)} />
                            </div>

                            <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
                                <button type="submit" className="btn btn-primary btn-block">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card" style={{borderTop: '4px solid var(--accent-color)'}}>
                <h2 className="card-title" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <Truck size={24} /> Nueva Entrega
                </h2>
                <form onSubmit={handleDeliver} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end'}}>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Seleccionar Morral</label>
                        <select className="form-control" value={backpackId} onChange={e => setBackpackId(e.target.value)} required>
                            <option value="">-- Elige Morral --</option>
                            {backpacks.map(b => <option key={b.id} value={b.id}>{b.internal_number} ({b.graphic_identifier})</option>)}
                        </select>
                    </div>
                    
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Seleccionar Escuela</label>
                        <select className="form-control" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} required>
                            <option value="">-- Elige Escuela --</option>
                            {schools.map(s => <option key={s.id} value={s.id}>{s.nombre} - {s.sector_nombre}</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Fecha y Hora</label>
                        <input type="datetime-local" className="form-control" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} required />
                    </div>

                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Nombre del Profesor</label>
                        <input 
                            className="form-control" 
                            value={newPavilionTeacher} 
                            onChange={handleTeacherChange} 
                            required 
                            placeholder="Ej: Juan Pérez" 
                            list="teacher-list"
                        />
                        <datalist id="teacher-list">
                            {[...new Set((Array.isArray(pavilions) ? pavilions : []).map(p => p.teacher_name).filter(Boolean))].map(t => (
                                <option key={t} value={t} />
                            ))}
                        </datalist>
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Celular</label>
                        <input className="form-control" value={newPavilionPhone} onChange={e => setNewPavilionPhone(e.target.value)} required placeholder="Ej: 3001234567" />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Grado / Aula</label>
                        <input className="form-control" value={newPavilionName} onChange={e => setNewPavilionName(e.target.value)} required placeholder="Ej: 5to Primaria" />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <label>Cant. de Alumnos (Opcional)</label>
                        <input type="number" min="0" className="form-control" value={newPavilionStudents} onChange={e => setNewPavilionStudents(e.target.value)} placeholder="0" />
                    </div>

                    <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
                        <button type="submit" className="btn btn-primary btn-block">Registrar Entrega</button>
                    </div>
                </form>
            </div>
            
            <h3 style={{marginTop: '40px', marginBottom: '15px'}}>Movimientos</h3>
            
            {/* Filters & Actions */}
            <div style={{
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '15px', 
                marginBottom: '20px', 
                backgroundColor: 'white', 
                padding: '15px', 
                borderRadius: '8px', 
                boxShadow: 'var(--card-shadow)',
                alignItems: 'flex-end'
            }}>
                <div className="form-group" style={{marginBottom: 0, flex: '1 1 200px'}}>
                    <label>Acción</label>
                    <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="Delivered">Entregas</option>
                        <option value="Picked_Up">Recogidas</option>
                    </select>
                </div>
                <div className="form-group" style={{marginBottom: 0, flex: '1 1 200px'}}>
                    <label>Escuela</label>
                    <select className="form-control" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
                        <option value="">Todas las Escuelas</option>
                        {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{marginBottom: 0, flex: '1 1 200px'}}>
                    <label>Morral</label>
                    <select className="form-control" value={filterBackpack} onChange={e => setFilterBackpack(e.target.value)}>
                        <option value="">Todos los Morrales</option>
                        {uniqueBackpacks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                <div>
                    <button onClick={exportToExcel} className="btn" style={{backgroundColor: '#217346', color: 'white', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <FileSpreadsheet size={18} /> Exportar a Excel
                    </button>
                </div>
            </div>

            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden'}}>
                    <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                        <tr>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'left'}}>Fecha</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'left'}}>Acción</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'left'}}>Morral</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'left'}}>Escuela</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'left'}}>Prof.</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'left'}}>Grado</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'left'}}>Cel.</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'center'}}>Alum.</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'left'}}>Usr.</th>
                            <th style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'center'}}>Opc.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(t => {
                            const isActiveDelivery = activeDeliveriesMap[t.id] === true;
                            
                            return (
                                <tr key={t.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem', whiteSpace: 'nowrap'}}>{formatDate(t.transaction_date)}</td>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem'}}>
                                        <span className={`badge ${t.action === 'Delivered' ? 'badge-blue' : 'badge-green'}`} style={{fontSize: '0.75rem'}}>
                                            {t.action === 'Delivered' ? 'Entrega' : 'Recogida'}
                                        </span>
                                    </td>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem', whiteSpace: 'nowrap'}}><strong>{t.backpack_graphic ? `${t.backpack_number} (${t.backpack_graphic})` : t.backpack_number}</strong></td>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={t.school_nombre}>{t.school_nombre || 'N/A'}</td>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={t.teacher_nombre}>{t.teacher_nombre || 'N/A'}</td>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={t.pavilion_nombre}>{t.pavilion_nombre || 'N/A'}</td>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={t.teacher_phone}>{t.teacher_phone || 'N/A'}</td>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem', textAlign: 'center'}}>{t.student_count || 0}</td>
                                    <td style={{padding: '8px 4px', fontSize: '0.85rem', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={t.registered_by}>{t.registered_by}</td>
                                    <td style={{padding: '8px 4px', textAlign: 'center', whiteSpace: 'nowrap'}}>
                                        {isActiveDelivery && (
                                            <button 
                                                title="Recibir / Finalizar Entrega"
                                                onClick={() => handlePickup(t)} 
                                                className="btn btn-success" 
                                                style={{padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', marginRight: '5px'}}
                                            >
                                                <CheckCircle size={14}/>
                                            </button>
                                        )}
                                        <button title="Editar Movimiento" onClick={() => handleEditClick(t)} className="btn btn-primary" style={{padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', marginRight: '5px'}}>
                                            <Pencil size={14}/>
                                        </button>
                                        <button title="Eliminar Movimiento" onClick={() => handleDelete(t.id)} className="btn btn-danger" style={{padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', backgroundColor: '#dc3545'}}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                    <div style={{padding: '20px', textAlign: 'center', backgroundColor: 'white', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'}}>
                        No hay movimientos que coincidan con los filtros.
                    </div>
                )}
            </div>
        </div>
        </TransactionErrorBoundary>
    );
};

export default Transactions;
