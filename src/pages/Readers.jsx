import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Search, Save, X, Edit, Clock, Users, BookOpen, Calendar } from 'lucide-react';

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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        showToast('Datos de contacto actualizados correctamente');
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
    <div>
      <h2 style={{marginBottom: '20px', color: 'var(--primary-color)'}}>
          <Users size={24} style={{verticalAlign: 'middle', marginRight: '10px'}}/>
          Padrón de Lectores
      </h2>

      {/* Barra de Filtros (Igual a Books.jsx) */}
      <div className="card" style={{borderTop: '4px solid var(--primary-color)', marginBottom: '20px'}}>
          <h3 className="card-title" style={{marginTop: 0, marginBottom: '15px', fontSize: '1rem'}}><Search size={16} style={{verticalAlign: 'middle'}}/> Búsqueda Global</h3>
          <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
              <div style={{flex: 1, minWidth: '300px'}}>
                  <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Buscar por cédula, nombre o apellido..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                  />
              </div>
          </div>
      </div>

      <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Resultados Registrados ({filteredReaders.length} / {readers.length})</h3>

      <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
              <thead style={{backgroundColor: 'var(--primary-color)', color: 'white'}}>
                  <tr>
                      <th style={{padding: '12px', textAlign: 'left', width: '130px'}}>Cédula</th>
                      <th style={{padding: '12px', textAlign: 'left'}}>Nombre Completo</th>
                      <th style={{padding: '12px', textAlign: 'left'}}>Teléfono</th>
                      <th style={{padding: '12px', textAlign: 'center', width: '120px'}}>Histórico</th>
                      <th style={{padding: '12px', textAlign: 'center', width: '120px'}}>En posesión</th>
                      <th style={{padding: '12px', textAlign: 'center', width: '120px'}}>Acciones</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredReaders.map((r) => (
                      <tr key={r.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                          <td style={{padding: '12px', fontSize: '0.9rem', color: '#555', fontWeight: 'bold'}}>{r.cedula}</td>
                          <td style={{padding: '12px', fontWeight: 'bold'}}>{r.nombre} {r.apellido}</td>
                          <td style={{padding: '12px'}}>{r.telefono || '-'}</td>
                          <td style={{padding: '12px', textAlign: 'center'}}>
                              <span className="badge badge-gray">{r.total_prestamos}</span>
                          </td>
                          <td style={{padding: '12px', textAlign: 'center'}}>
                              {r.prestamos_activos > 0 ? (
                                  <span className="badge" style={{backgroundColor: 'var(--secondary-color)', color: 'white'}} title="En uso">{r.prestamos_activos}</span>
                              ) : (
                                  <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>0</span>
                              )}
                          </td>
                          <td style={{padding: '12px', textAlign: 'center'}}>
                              <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                  <button 
                                      className="btn btn-secondary" 
                                      style={{padding: '6px 10px'}}
                                      title="Ver Historial"
                                      onClick={() => openHistoryModal(r)}>
                                      <Clock size={16} />
                                  </button>
                                  <button 
                                      className="btn btn-primary" 
                                      style={{padding: '6px 10px', backgroundColor: 'var(--accent-color)'}}
                                      title="Editar Contacto"
                                      onClick={() => openEditModal(r)}>
                                      <Edit size={16} />
                                  </button>
                              </div>
                          </td>
                      </tr>
                  ))}
                  {filteredReaders.length === 0 && (
                      <tr>
                          <td colSpan="6" style={{padding: '20px', textAlign: 'center', background: 'white', color: '#718096'}}>
                              No se encontraron lectores.
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>

      {/* Modal: Editar Lector (Estilo emergente idéntico a Books) */}
      {isEditModalOpen && selectedReader && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
              display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
          }}>
              <div className="card" style={{width: '100%', maxWidth: '400px', margin: 0, position: 'relative', animation: 'fadeIn 0.2s'}}>
                  <button onClick={closeEditModal} style={{position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                      <X size={24}/>
                  </button>
                  <h2 className="card-title" style={{marginTop: 0, paddingRight: '30px'}}>
                      Modificar Contacto Lector
                  </h2>
                  
                  <form onSubmit={handleEditSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px'}}>
                      <div className="form-group" style={{ backgroundColor: '#f7fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0' }}>
                          <small style={{ color: '#718096', display: 'block', marginBottom: '5px' }}>Cédula: {selectedReader.cedula}</small>
                          <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '8px', color: 'var(--primary-color)' }}>{selectedReader.nombre} {selectedReader.apellido}</strong>
                          <small style={{ color: '#e53e3e', fontSize: '0.8rem' }}>Por seguridad del catálogo, solo los datos de rastreo/contacto pueden modificarse.</small>
                      </div>

                      <div className="form-group" style={{marginBottom: 0}}>
                          <label>Teléfono</label>
                          <input 
                              type="text" 
                              className="form-control" 
                              value={editForm.telefono} 
                              onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                              placeholder="Ej: 0987654321" 
                          />
                      </div>

                      <div className="form-group" style={{marginBottom: 0}}>
                          <label>Dirección</label>
                          <textarea 
                              className="form-control" 
                              value={editForm.direccion} 
                              onChange={(e) => setEditForm({...editForm, direccion: e.target.value})}
                              rows={2}
                              placeholder="Dirección del domicilio / sector" 
                          />
                      </div>

                      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                          <button type="button" className="btn btn-secondary" style={{flex: 1}} onClick={closeEditModal}>Cancelar</button>
                          <button type="submit" className="btn btn-primary" style={{flex: 1, backgroundColor: 'var(--accent-color)'}}><Save size={18} style={{verticalAlign: 'bottom'}}/> Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Modal: Historial del Lector (Estilo emergente idéntico a Books) */}
      {isHistoryModalOpen && selectedReader && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
              display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
          }}>
              <div className="card" style={{width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', margin: 0, position: 'relative', animation: 'fadeIn 0.2s'}}>
                  <button onClick={closeHistoryModal} style={{position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                      <X size={24}/>
                  </button>
                  <h2 className="card-title" style={{marginTop: 0, paddingRight: '30px', color: 'var(--primary-color)'}}>
                      <Clock size={22} style={{verticalAlign: 'middle', marginRight: '8px'}}/>
                      Historial Bibliográfico
                  </h2>
                  <p style={{margin: '-5px 0 20px 0', color: '#555'}}><strong>{selectedReader.nombre} {selectedReader.apellido}</strong> (C.C. {selectedReader.cedula})</p>
                  
                  <div>
                      {readerHistory.length === 0 ? (
                          <p style={{textAlign: 'center', color: '#666', padding: '20px'}}>Este lector nunca ha solicitado un libro del catálogo.</p>
                      ) : (
                          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                              {readerHistory.map(h => (
                                  <div key={h.loan_id} style={{border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px', backgroundColor: h.status === 'Active' ? 'rgba(243, 156, 18, 0.05)' : '#fcfcfc'}}>
                                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                                          <strong style={{fontSize: '1.1rem'}}><BookOpen size={16} style={{verticalAlign: 'text-bottom'}}/> {h.book_title}</strong>
                                          <span className={`badge ${h.status === 'Active' ? 'badge-primary' : 'badge-gray'}`}>
                                              {h.status === 'Active' ? 'Lo tiene actualmente' : 'Devuelto'}
                                          </span>
                                      </div>
                                      
                                      <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                                          <div style={{flex: 1, minWidth: '200px'}}>
                                              <p style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555'}}>
                                                  <Calendar size={14} style={{verticalAlign: 'text-bottom'}}/> <strong>Entrega:</strong> <br/>
                                                  {new Date(h.loan_date).toLocaleString()} <br/>
                                                  <span style={{fontSize: '0.8rem', color: '#999'}}>(Aprobado por: {h.admin_prestamo || 'Sistema'})</span>
                                              </p>
                                          </div>
                                          <div style={{flex: 1, minWidth: '200px'}}>
                                              {h.return_date ? (
                                                  <p style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555'}}>
                                                      <Calendar size={14} style={{verticalAlign: 'text-bottom'}}/> <strong>Recepción:</strong> <br/>
                                                      {new Date(h.return_date).toLocaleString()} <br/>
                                                      <span style={{fontSize: '0.8rem', color: '#999'}}>(Recibido por: {h.admin_recepcion || 'Sistema'})</span>
                                                  </p>
                                              ) : (
                                                  <p style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#e53e3e'}}>
                                                     El libro no ha retornado a la biblioteca.
                                                  </p>
                                              )}
                                          </div>
                                      </div>
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

export default Readers;
