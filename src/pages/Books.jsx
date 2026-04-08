import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Trash, Edit2, Search, HandHeart, History, X, BookOpen, User, Calendar } from 'lucide-react';

const Books = () => {
    const [books, setBooks] = useState([]);
    
    // Filtros de búsqueda
    const [searchIsbn, setSearchIsbn] = useState('');
    const [searchTitle, setSearchTitle] = useState('');
    const [searchAuthor, setSearchAuthor] = useState('');
    
    // Lending State
    const [lendingBook, setLendingBook] = useState(null);
    const [readerCedula, setReaderCedula] = useState('');
    const [readerNombre, setReaderNombre] = useState('');
    const [readerApellido, setReaderApellido] = useState('');
    const [readerTelefono, setReaderTelefono] = useState('');
    const [readerDireccion, setReaderDireccion] = useState('');
    
    // History State
    const [historyBook, setHistoryBook] = useState(null);
    const [bookHistory, setBookHistory] = useState([]);

    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await fetchWithAuth('/api/books');
            setBooks(await res.json());
        } catch (e) {
            console.error(e);
        }
    }

    const handleDelete = async (id) => {
        if(!window.confirm('¿Está seguro de eliminar este libro del catálogo? Todo su historial también desaparecerá.')) return;
        try {
            const res = await fetchWithAuth(`/api/books/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Libro eliminado correctamente');
                loadData();
            } else {
                showToast('Error al eliminar', 'error');
            }
        } catch(e) {
             console.error(e);
        }
    }

    const buscarLector = async () => {
        if(!readerCedula) return;
        try {
            showToast('Buscando lector...', 'info');
            const res = await fetchWithAuth(`/api/readers/${readerCedula}`);
            if (res.ok) {
                const data = await res.json();
                setReaderNombre(data.nombre);
                setReaderApellido(data.apellido);
                setReaderTelefono(data.telefono || '');
                setReaderDireccion(data.direccion || '');
                showToast('Lector encontrado');
            } else {
                setReaderNombre('');
                setReaderApellido('');
                setReaderTelefono('');
                setReaderDireccion('');
                showToast('Lector nuevo. Ingresa sus datos.', 'info');
            }
        } catch(e) { console.error(e); }
    };

    const handleLendSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                book_id: lendingBook.id,
                cedula: readerCedula,
                nombre: readerNombre,
                apellido: readerApellido,
                telefono: readerTelefono,
                direccion: readerDireccion
            };
            const res = await fetchWithAuth('/api/book-loans/lend', {
                method: 'POST', body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast('Libro prestado exitosamente');
                setLendingBook(null); // Close modal
                loadData(); // Refresh 'prestados'
            } else {
                const data = await res.json();
                showToast(data.error || 'Error al prestar libro', 'error');
            }
        } catch(e) { console.error(e); }
    };

    const openHistory = async (b) => {
        setHistoryBook(b);
        setBookHistory([]);
        try {
            const res = await fetchWithAuth(`/api/book-loans/history/book/${b.id}`);
            if (res.ok) {
                setBookHistory(await res.json());
            }
        } catch(e) { console.error(e); }
    };

    // Aplicar Filtros
    const filteredBooks = books.filter(b => {
        const tObj = b.titulo ? b.titulo.toLowerCase() : '';
        const aObj = b.autor ? b.autor.toLowerCase() : '';
        const iObj = b.isbn ? b.isbn.toLowerCase() : '';
        
        return tObj.includes(searchTitle.toLowerCase()) &&
               aObj.includes(searchAuthor.toLowerCase()) &&
               iObj.includes(searchIsbn.toLowerCase());
    });

    return (
        <div>
            <h2 style={{marginBottom: '20px', color: 'var(--primary-color)'}}>
                <BookOpen size={24} style={{verticalAlign: 'middle', marginRight: '10px'}}/>
                Catálogo de Consulta de Libros
            </h2>

            {/* Barra de Filtros */}
            <div className="card" style={{borderTop: '4px solid var(--primary-color)', marginBottom: '20px'}}>
                <h3 className="card-title" style={{marginTop: 0, marginBottom: '15px', fontSize: '1rem'}}><Search size={16} style={{verticalAlign: 'middle'}}/> Filtros de Búsqueda</h3>
                <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                    <div style={{flex: 1, minWidth: '200px'}}>
                        <input type="text" className="form-control" placeholder="Buscar por Título..." value={searchTitle} onChange={e => setSearchTitle(e.target.value)} />
                    </div>
                    <div style={{flex: 1, minWidth: '200px'}}>
                        <input type="text" className="form-control" placeholder="Buscar por Autor..." value={searchAuthor} onChange={e => setSearchAuthor(e.target.value)} />
                    </div>
                    <div style={{flex: 1, minWidth: '150px'}}>
                        <input type="text" className="form-control" placeholder="Buscar por ISBN..." value={searchIsbn} onChange={e => setSearchIsbn(e.target.value)} />
                    </div>
                </div>
            </div>

            <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Resultados ({filteredBooks.length} / {books.length} Registros)</h3>
            
            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                        <tr>
                            <th style={{padding: '12px', textAlign: 'left', width: '130px'}}>ISBN</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Título</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Autor</th>
                            <th style={{padding: '12px', textAlign: 'left'}}>Editorial</th>
                            <th style={{padding: '12px', textAlign: 'center', width: '80px'}}>Año</th>
                            <th style={{padding: '12px', textAlign: 'center', width: '80px'}}>Cant.</th>
                            <th style={{padding: '12px', textAlign: 'center', width: '100px'}}>Disp.</th>
                            <th style={{padding: '12px', textAlign: 'center', width: '180px'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBooks.map(b => {
                            const disponibles = b.cantidad - (b.prestados || 0);
                            const agotado = disponibles <= 0;
                            return (
                            <tr key={b.id} style={{borderBottom: '1px solid var(--border-color)', opacity: agotado ? 0.7 : 1}}>
                                <td style={{padding: '12px', fontSize: '0.9rem', color: '#555'}}>{b.isbn || 'N/A'}</td>
                                <td style={{padding: '12px', fontWeight: 'bold'}}>{b.titulo}</td>
                                <td style={{padding: '12px'}}>{b.autor || '-'}</td>
                                <td style={{padding: '12px'}}>{b.editorial || '-'}</td>
                                <td style={{padding: '12px', textAlign: 'center'}}>{b.anio || '-'}</td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <span className="badge badge-gray">{b.cantidad}</span>
                                </td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    {agotado ? (
                                        <span className="badge" style={{backgroundColor: 'var(--secondary-color)', color: 'white'}} title="Prestado / Agotado">P</span>
                                    ) : (
                                        <span className="badge" style={{backgroundColor: 'var(--success-color)', color: 'white'}} title="Disponibles">{disponibles}</span>
                                    )}
                                </td>
                                <td style={{padding: '12px', textAlign: 'center'}}>
                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                        <button 
                                            onClick={() => {
                                                setLendingBook(b);
                                                setReaderCedula(''); setReaderNombre(''); setReaderApellido(''); setReaderTelefono(''); setReaderDireccion('');
                                            }} 
                                            className="btn btn-primary" 
                                            style={{padding: '6px 10px', backgroundColor: 'var(--accent-color)'}} 
                                            title="Prestar"
                                            disabled={agotado}
                                        >
                                            <HandHeart size={16} />
                                        </button>
                                        <button onClick={() => openHistory(b)} className="btn btn-secondary" style={{padding: '6px 10px'}} title="Historial">
                                            <History size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(b.id)} className="btn btn-danger" style={{padding: '6px 10px'}} title="Eliminar">
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredBooks.length === 0 && <div style={{padding: '20px', textAlign: 'center', background: 'white', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'}}>No se encontraron libros que coincidan con la búsqueda.</div>}
            </div>

            {/* Modal Prestar Libro */}
            {lendingBook && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                }}>
                    <div className="card" style={{width: '100%', maxWidth: '500px', margin: 0, position: 'relative', animation: 'fadeIn 0.2s'}}>
                        <button onClick={() => setLendingBook(null)} style={{position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                            <X size={24}/>
                        </button>
                        <h2 className="card-title" style={{marginTop: 0, paddingRight: '30px'}}>
                            Prestar: <span style={{color: 'var(--primary-color)'}}>{lendingBook.titulo}</span>
                        </h2>
                        
                        <form onSubmit={handleLendSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px'}}>
                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Cédula del Lector *</label>
                                <div style={{display: 'flex', gap: '5px'}}>
                                    <input className="form-control" placeholder="No. Cédula" value={readerCedula} onChange={e => setReaderCedula(e.target.value)} required />
                                    <button type="button" onClick={buscarLector} className="btn btn-secondary" title="Buscar Lector"><Search size={16}/></button>
                                </div>
                            </div>
                            
                            <div style={{display: 'flex', gap: '10px'}}>
                                <div className="form-group" style={{marginBottom: 0, flex: 1}}>
                                    <label>Nombre *</label>
                                    <input className="form-control" value={readerNombre} onChange={e => setReaderNombre(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{marginBottom: 0, flex: 1}}>
                                    <label>Apellido *</label>
                                    <input className="form-control" value={readerApellido} onChange={e => setReaderApellido(e.target.value)} required />
                                </div>
                            </div>

                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Teléfono</label>
                                <input className="form-control" value={readerTelefono} onChange={e => setReaderTelefono(e.target.value)} />
                            </div>

                            <div className="form-group" style={{marginBottom: 0}}>
                                <label>Dirección</label>
                                <input className="form-control" value={readerDireccion} onChange={e => setReaderDireccion(e.target.value)} />
                            </div>

                            <div style={{marginTop: '10px'}}>
                                <button type="submit" className="btn btn-primary btn-block" style={{backgroundColor: 'var(--accent-color)'}}>
                                    <HandHeart size={18}/> Confirmar Préstamo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Historial de Libro Individual */}
            {historyBook && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                }}>
                    <div className="card" style={{width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', margin: 0, position: 'relative', animation: 'fadeIn 0.2s'}}>
                        <button onClick={() => setHistoryBook(null)} style={{position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                            <X size={24}/>
                        </button>
                        <h2 className="card-title" style={{marginTop: 0, paddingRight: '30px', color: 'var(--primary-color)'}}>
                            <History size={22} style={{verticalAlign: 'middle', marginRight: '8px'}}/>
                            Historial: {historyBook.titulo}
                        </h2>
                        
                        <div style={{marginTop: '20px'}}>
                            {bookHistory.length === 0 ? (
                                <p style={{textAlign: 'center', color: '#666', padding: '20px'}}>Este libro nunca ha sido prestado.</p>
                            ) : (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                    {bookHistory.map(h => (
                                        <div key={h.loan_id} style={{border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px', backgroundColor: h.status === 'Active' ? 'rgba(243, 156, 18, 0.05)' : '#fcfcfc'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                                                <strong style={{fontSize: '1.1rem'}}><User size={16} style={{verticalAlign: 'text-bottom'}}/> Lector: {h.nombre} {h.apellido}</strong>
                                                <span className={`badge ${h.status === 'Active' ? 'badge-primary' : 'badge-gray'}`}>
                                                    {h.status === 'Active' ? 'Aún lo tiene' : 'Devuelto'}
                                                </span>
                                            </div>
                                            <p style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555'}}><strong>Cédula:</strong> {h.cedula}</p>
                                            <p style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555'}}>
                                                <Calendar size={14} style={{verticalAlign: 'text-bottom'}}/> <strong>Prestado:</strong> {new Date(h.loan_date).toLocaleString()} <span style={{fontSize: '0.8rem', color: '#999'}}>(Por: {h.admin_prestamo || 'Desconocido'})</span>
                                            </p>
                                            {h.return_date && (
                                                <p style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555'}}>
                                                    <Calendar size={14} style={{verticalAlign: 'text-bottom'}}/> <strong>Devuelto:</strong> {new Date(h.return_date).toLocaleString()} <span style={{fontSize: '0.8rem', color: '#999'}}>(Por: {h.admin_recepcion || 'Desconocido'})</span>
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Books;
