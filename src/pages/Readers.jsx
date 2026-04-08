import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Search, Save, X, Edit, Clock, Mail, Phone, MapPin } from 'lucide-react';

const Readers = () => {
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [readers, setReaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedReader, setSelectedReader] = useState(null);
  const [editForm, setEditForm] = useState({ telefono: '', direccion: '' });
  const [readerHistory, setReaderHistory] = useState([]);

  useEffect(() => {
    fetchReaders();
  }, []);

  const fetchReaders = async () => {
    try {
      const res = await fetchWithAuth('/api/readers');
      if (res.ok) {
        setReaders(await res.json());
      }
    } catch (error) {
      console.error(error);
      showToast('Error al cargar lectores', 'error');
    }
  };

  const filteredReaders = readers.filter(r => 
    (r.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.apellido?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.cedula?.includes(searchTerm))
  );

  const openEditModal = (reader) => {
    setSelectedReader(reader);
    setEditForm({ telefono: reader.telefono || '', direccion: reader.direccion || '' });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedReader(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`/api/readers/${selectedReader.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        showToast('Datos de contacto actualizados correctamente', 'success');
        fetchReaders();
        closeEditModal();
      } else {
        showToast('Error al actualizar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  const openHistoryModal = async (reader) => {
    setSelectedReader(reader);
    try {
      const res = await fetchWithAuth(`/api/book-loans/history/reader/${reader.id}`);
      if (res.ok) {
         setReaderHistory(await res.json());
         setIsHistoryModalOpen(true);
      }
    } catch (error) {
      showToast('Error cargando historial', 'error');
    }
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedReader(null);
    setReaderHistory([]);
  };

  return (
    <div className="fade-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#2d3748', margin: 0 }}>Lectores</h2>
      </div>

      <div className="search-bar-container" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <div style={{ position: 'relative', flex: '1' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a0aec0' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por cédula, nombre o apellido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Cédula</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Teléfono</th>
              <th>Préstamos Totales</th>
              <th>En Posesión</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredReaders.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.cedula}</strong></td>
                <td>{r.nombre}</td>
                <td>{r.apellido}</td>
                <td>{r.telefono || '-'}</td>
                <td>{r.total_prestamos}</td>
                <td>
                    {r.prestamos_activos > 0 ? (
                       <span className="badge badge-warning" style={{ fontWeight: 'bold' }}>{r.prestamos_activos} libros</span>
                    ) : (
                       <span style={{ color: '#a0aec0' }}>Ninguno</span>
                    )}
                </td>
                <td style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button 
                    className="action-btn view-btn"
                    title="Ver Historial"
                    onClick={() => openHistoryModal(r)}>
                    <Clock size={16} />
                  </button>
                  <button 
                    className="action-btn edit-btn"
                    title="Editar Contacto"
                    onClick={() => openEditModal(r)}>
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredReaders.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                  No se encontraron lectores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Editar Lector Modal */}
      {isEditModalOpen && selectedReader && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Modificar Contacto Lector</h3>
              <button className="close-btn" onClick={closeEditModal}><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-body form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="form-group" style={{ backgroundColor: '#f7fafc', padding: '10px', borderRadius: '8px' }}>
                <small style={{ color: '#718096' }}>Cédula: {selectedReader.cedula}</small><br/>
                <strong style={{ fontSize: '1.1rem' }}>{selectedReader.nombre} {selectedReader.apellido}</strong><br/>
                <small style={{ color: '#e53e3e' }}>Solo los datos de contacto son modificables por seguridad.</small>
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editForm.telefono} 
                  onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                  placeholder="Ej: 0987654321" 
                />
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <textarea 
                  className="input-field" 
                  value={editForm.direccion} 
                  onChange={(e) => setEditForm({...editForm, direccion: e.target.value})}
                  rows={2}
                  placeholder="Dirección del domicilio" 
                />
              </div>

              <div className="modal-footer" style={{ gridColumn: '1 / -1' }}>
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary"><Save size={18}/> Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historial Modal */}
      {isHistoryModalOpen && selectedReader && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Historial Bibliográfico: {selectedReader.nombre} {selectedReader.apellido}</h3>
              <button className="close-btn" onClick={closeHistoryModal}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Libro</th>
                      <th>ISBN</th>
                      <th>Estado</th>
                      <th>Préstamo</th>
                      <th>Devolución</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readerHistory.map((h) => (
                      <tr key={h.loan_id} className={h.status === 'Active' ? 'row-active-loan' : ''}>
                        <td><strong>{h.book_title}</strong><br/><small style={{color: '#718096'}}>{h.book_author}</small></td>
                        <td>{h.isbn || '-'}</td>
                        <td>
                          <span className={`badge ${h.status === 'Returned' ? 'badge-success' : 'badge-warning'}`}>
                            {h.status === 'Returned' ? 'Devuelto' : 'En Posesión'}
                          </span>
                        </td>
                        <td>
                          {new Date(h.loan_date).toLocaleString()}<br/>
                          <small style={{ color: '#718096' }}>por {h.admin_prestamo}</small>
                        </td>
                        <td>
                          {h.return_date ? (
                            <>
                              {new Date(h.return_date).toLocaleString()}<br/>
                              <small style={{ color: '#718096' }}>a {h.admin_recepcion}</small>
                            </>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                    {readerHistory.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                          No hay historial registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Readers;
