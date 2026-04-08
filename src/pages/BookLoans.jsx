import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { BookOpen, CheckCircle } from 'lucide-react';

const BookLoans = () => {
    const [loans, setLoans] = useState([]);
    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await fetchWithAuth('/api/book-loans/active');
            if (res.ok) {
                setLoans(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
    }

    const handleReturn = async (loanId) => {
        if (!window.confirm('¿Confirmas que el lector ha devuelto este libro a la biblioteca?')) return;
        
        try {
            const res = await fetchWithAuth(`/api/book-loans/return/${loanId}`, { method: 'POST' });
            if (res.ok) {
                showToast('Libro devuelto. La P ha sido retirada en el catálogo.');
                loadData();
            } else {
                showToast('Error al procesar la devolución', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error de conexión', 'error');
        }
    }

    return (
        <div>
            <h2 style={{marginBottom: '20px', color: 'var(--primary-color)'}}>
                <BookOpen size={24} style={{verticalAlign: 'middle', marginRight: '10px'}}/>
                Préstamos Activos (Libros Fuera de Biblioteca)
            </h2>

            <div className="card" style={{borderTop: '5px solid var(--accent-color)'}}>
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                        <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                            <tr>
                                <th style={{padding: '12px', textAlign: 'left', width: '130px'}}>ISBN</th>
                                <th style={{padding: '12px', textAlign: 'left'}}>Libro / Autor</th>
                                <th style={{padding: '12px', textAlign: 'left'}}>Lector</th>
                                <th style={{padding: '12px', textAlign: 'left'}}>Cédula</th>
                                <th style={{padding: '12px', textAlign: 'left', width: '140px'}}>Fecha Préstamo</th>
                                <th style={{padding: '12px', textAlign: 'center', width: '180px'}}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.map(loan => (
                                <tr key={loan.loan_id} style={{borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s'}}>
                                    <td style={{padding: '12px', fontSize: '0.9rem', color: '#555'}}>{loan.isbn || 'N/A'}</td>
                                    <td style={{padding: '12px'}}>
                                        <strong style={{color: 'var(--primary-color)'}}>{loan.book_title}</strong>
                                        <br/>
                                        <span style={{fontSize: '0.85rem', color: '#666'}}>{loan.book_author || 'Sin autor'}</span>
                                    </td>
                                    <td style={{padding: '12px', fontWeight: 'bold'}}>{loan.nombre} {loan.apellido}</td>
                                    <td style={{padding: '12px', color: '#555'}}>{loan.cedula}</td>
                                    <td style={{padding: '12px', fontSize: '0.9rem', color: '#444'}}>
                                        {new Date(loan.loan_date).toLocaleDateString()}
                                    </td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        <button 
                                            onClick={() => handleReturn(loan.loan_id)} 
                                            className="btn btn-primary" 
                                            style={{backgroundColor: 'var(--success-color)', width: '100%'}}
                                            title="Confirmar recepción del libro."
                                        >
                                            <CheckCircle size={16} style={{marginRight: '5px', verticalAlign: 'middle'}}/> Recibido
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loans.length === 0 && (
                        <div style={{padding: '40px', textAlign: 'center', background: 'white', color: '#666'}}>
                            No hay préstamos activos. Todos los ejemplares están actualmente en la biblioteca.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookLoans;
