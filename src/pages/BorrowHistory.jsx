import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Search, History, Book, User, Calendar } from 'lucide-react';

const BorrowHistory = () => {
    const [history, setHistory] = useState([]);
    const [searchCedula, setSearchCedula] = useState('');
    const [searchTitle, setSearchTitle] = useState('');
    const [searchAuthor, setSearchAuthor] = useState('');

    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await fetchWithAuth('/api/book-loans/history');
            if (res.ok) {
                setHistory(await res.json());
            }
        } catch (e) {
            console.error(e);
            showToast('Error cargando el historial', 'error');
        }
    }

    const filteredHistory = history.filter(h => {
        const cObj = h.cedula ? h.cedula.toLowerCase() : '';
        const tObj = h.book_title ? h.book_title.toLowerCase() : '';
        const aObj = h.book_author ? h.book_author.toLowerCase() : '';
        
        return cObj.includes(searchCedula.toLowerCase()) &&
               tObj.includes(searchTitle.toLowerCase()) &&
               aObj.includes(searchAuthor.toLowerCase());
    });

    return (
        <div>
            <h2 style={{marginBottom: '20px', color: 'var(--primary-color)'}}>
                <History size={24} style={{verticalAlign: 'middle', marginRight: '10px'}}/>
                Auditoría Global de Préstamos
            </h2>

            <div className="card" style={{borderTop: '4px solid var(--primary-color)', marginBottom: '20px'}}>
                <h3 className="card-title" style={{marginTop: 0, marginBottom: '15px', fontSize: '1rem'}}><Search size={16} style={{verticalAlign: 'middle'}}/> Filtros de Búsqueda</h3>
                <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                    <div style={{flex: 1, minWidth: '150px'}}>
                        <input type="text" className="form-control" placeholder="Cédula Lector..." value={searchCedula} onChange={e => setSearchCedula(e.target.value)} />
                    </div>
                    <div style={{flex: 1, minWidth: '200px'}}>
                        <input type="text" className="form-control" placeholder="Título del Libro..." value={searchTitle} onChange={e => setSearchTitle(e.target.value)} />
                    </div>
                    <div style={{flex: 1, minWidth: '200px'}}>
                        <input type="text" className="form-control" placeholder="Autor del Libro..." value={searchAuthor} onChange={e => setSearchAuthor(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="card" style={{padding: 0, overflowX: 'auto', borderTop: '5px solid var(--accent-color)'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white'}}>
                    <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                        <tr>
                            <th style={{padding: '12px', textAlign: 'left'}}>Libro</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Lector</th>
                            <th style={{padding: '12px', textAlign: 'left', width: '220px'}}>Fecha de Préstamo</th>
                            <th style={{padding: '12px', textAlign: 'left', width: '220px'}}>Fecha de Devolución</th>
                            <th style={{padding: '12px', textAlign: 'center', width: '120px'}}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.map(h => (
                            <tr key={h.loan_id} style={{borderBottom: '1px solid var(--border-color)', backgroundColor: h.status === 'Active' ? 'rgba(243, 156, 18, 0.05)' : 'transparent'}}>
                                <td style={{padding: '12px'}}>
                                    <Book size={16} style={{color: 'var(--primary-color)', verticalAlign: 'text-bottom', marginRight: '5px'}}/>
                                    <strong>{h.book_title}</strong>
                                    <div style={{fontSize: '0.8rem', color: '#666', marginTop: '2px'}}>{h.book_author} - (ISBN: {h.isbn || 'N/A'})</div>
                                </td>
                                <td style={{padding: '12px'}}>
                                    <User size={16} style={{color: 'var(--accent-color)', verticalAlign: 'text-bottom', marginRight: '5px'}}/>
                                    <strong>{h.nombre} {h.apellido}</strong>
                                    <div style={{fontSize: '0.8rem', color: '#666', marginTop: '2px'}}>{h.cedula}</div>
                                </td>
                                <td style={{padding: '12px', fontSize: '0.9rem'}}>
                                    <Calendar size={14} style={{verticalAlign: 'text-bottom', marginRight: '5px', color: '#555'}}/>
                                    {new Date(h.loan_date).toLocaleString()}
                                    <br/>
                                    <span style={{fontSize: '0.75rem', color: '#888'}}>Entregó: {h.admin_prestamo || 'Desconocido'}</span>
                                </td>
                                <td style={{padding: '12px', fontSize: '0.9rem'}}>
                                    {h.status === 'Returned' ? (
                                        <>
                                            <Calendar size={14} style={{verticalAlign: 'text-bottom', marginRight: '5px', color: 'var(--success-color)'}}/>
                                            {new Date(h.return_date).toLocaleString()}
                                            <br/>
                                            <span style={{fontSize: '0.75rem', color: '#888'}}>Recibió: {h.admin_recepcion || 'Desconocido'}</span>
                                        </>
                                    ) : (
                                        <span style={{color: '#999', fontStyle: 'italic'}}>Aún no devuelto</span>
                                    )}
                                </td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    {h.status === 'Returned' ? (
                                        <span className="badge badge-primary" style={{backgroundColor: '#95a5a6'}}>Devuelto</span>
                                    ) : (
                                        <span className="badge badge-primary" style={{backgroundColor: 'var(--secondary-color)'}}>Prestado</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredHistory.length === 0 && (
                    <div style={{padding: '40px', textAlign: 'center', background: 'white', color: '#666'}}>
                        No se encontraron registros de historial con esos filtros.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BorrowHistory;
