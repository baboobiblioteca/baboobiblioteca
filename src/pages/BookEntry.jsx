import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { Plus, Upload, Search, BookOpen, Camera, X } from 'lucide-react';

const BookEntry = () => {
    const [uploadMode, setUploadMode] = useState('manual'); // 'manual' | 'bulk'
    
    // Form fields
    const [titulo, setTitulo] = useState('');
    const [autor, setAutor] = useState('');
    const [isbn, setIsbn] = useState('');
    const [editorial, setEditorial] = useState('');
    const [anio, setAnio] = useState('');
    const [edicion, setEdicion] = useState('');
    const [cantidad, setCantidad] = useState(1);
    
    // Scanner state
    const [isScanning, setIsScanning] = useState(false);
    
    const [excelFile, setExcelFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const fileInputRef = useRef(null);
    const { fetchWithAuth } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        let scanner = null;
        if (isScanning) {
            scanner = new window.Html5QrcodeScanner(
              "reader",
              { fps: 10, qrbox: {width: 250, height: 150} },
              /* verbose= */ false
            );
            scanner.render(
                (decodedText) => {
                    setIsbn(decodedText);
                    setIsScanning(false);
                    scanner.clear().catch(console.error);
                    showToast('Código escaneado con éxito');
                },
                (error) => {
                    // Ignore background scan errors
                }
            );
        }
        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [isScanning]);

    const resetForm = () => {
        setTitulo(''); 
        setAutor(''); 
        setIsbn(''); 
        setEditorial(''); 
        setAnio('');
        setEdicion('');
        setCantidad(1); 
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = { titulo, autor, isbn, editorial, anio, edicion, cantidad };

        try {
            const res = await fetchWithAuth('/api/books', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || 'Error al procesar el libro', 'error');
                return;
            }
            
            showToast('Libro registrado en el inventario correctamente');
            resetForm();
        } catch (e) {
            console.error(e);
            showToast('Error de red al registrar libro', 'error');
        }
    }

    const handleExcelUpload = async (e) => {
        e.preventDefault();
        if (!excelFile) {
            showToast('Por favor, selecciona un archivo Excel (.xlsx, .csv)', 'error');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', excelFile);

        try {
            const res = await fetchWithAuth('/api/books/upload', {
                method: 'POST',
                body: formData,
                headers: {} 
            });
            const data = await res.json();
            
            if (!res.ok) {
                showToast(data.error || 'Error subiendo archivo', 'error');
            } else {
                showToast(data.message || 'Libros importados correctamente');
                setExcelFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error(err);
            showToast('Error de red al subir excel', 'error');
        } finally {
            setIsUploading(false);
        }
    }

    const buscarISBN = async () => {
        if (!isbn) {
            showToast('Por favor ingresa un ISBN primero para buscar', 'error');
            return;
        }
        showToast('Buscando información del libro...', 'info');
        try {
            const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
            const data = await response.json();
            const bookData = data[`ISBN:${isbn}`];
            
            if (bookData) {
                if (bookData.title) setTitulo(bookData.title);
                if (bookData.authors && bookData.authors.length > 0) setAutor(bookData.authors[0].name);
                if (bookData.publishers && bookData.publishers.length > 0) setEditorial(bookData.publishers[0].name);
                if (bookData.publish_date) setAnio(bookData.publish_date);
                showToast('¡Datos del libro encontrados!');
            } else {
                showToast('No se encontró información para este ISBN', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error conectando al servicio de ISBN', 'error');
        }
    };

    return (
        <div>
            <h2 style={{marginBottom: '20px', color: 'var(--primary-color)'}}>
                <BookOpen size={24} style={{verticalAlign: 'middle', marginRight: '10px'}}/>
                Ingreso de Nuevos Libros
            </h2>

            <div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
                <button 
                    onClick={() => setUploadMode('manual')} 
                    className={`btn ${uploadMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{flex: 1, padding: '15px', fontSize: '1.1rem'}}
                >
                    <Plus size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
                    Ingreso Individual / ISBN
                </button>
                <button 
                    onClick={() => setUploadMode('bulk')} 
                    className={`btn ${uploadMode === 'bulk' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{flex: 1, padding: '15px', fontSize: '1.1rem', backgroundColor: uploadMode === 'bulk' ? '#2ecc71' : undefined, borderColor: uploadMode === 'bulk' ? '#2ecc71' : undefined}}
                >
                    <Upload size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
                    Carga Masiva (Excel)
                </button>
            </div>

            {uploadMode === 'bulk' && (
                <div className="card" style={{borderTop: '4px solid #2ecc71', marginBottom: '30px', animation: 'fadeIn 0.3s ease-in-out'}}>
                    <h3 className="card-title" style={{margin: 0, paddingBottom: 15}}><Upload size={20} style={{verticalAlign: 'bottom', marginRight: 8}}/> Importar desde Archivo</h3>
                    <form onSubmit={handleExcelUpload} style={{display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
                        <div style={{flex: 1}}>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv" 
                                className="form-control" 
                                onChange={e => setExcelFile(e.target.files[0])}
                                ref={fileInputRef}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{backgroundColor: '#2ecc71'}} disabled={isUploading || !excelFile}>
                            {isUploading ? 'Subiendo e indexando...' : 'Procesar e Importar'}
                        </button>
                        <div style={{width: '100%', fontSize: '0.85rem', color: '#666', marginTop: '5px'}}>
                            Nota: El archivo debe contener columnas como: Título, Autor, ISBN, Editorial, Año, Cantidad. El sistema mapeará automáticamente los campos parecidos.
                        </div>
                    </form>
                </div>
            )}

            {uploadMode === 'manual' && (
                <div className="card" style={{borderTop: '4px solid var(--accent-color)', marginBottom: '30px', animation: 'fadeIn 0.3s ease-in-out'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                        <h2 className="card-title" style={{margin: 0, border: 'none', padding: 0}}>
                            Registro Manual del Libro
                        </h2>
                    </div>
                    
                    <form onSubmit={handleSubmit} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end'}}>
                        <div className="form-group" style={{marginBottom: 0}}>
                            <label>ISBN (Código de Barras)</label>
                            <div style={{display: 'flex', gap: '5px'}}>
                                <input className="form-control" placeholder="Ej. 978..." value={isbn} onChange={e => setIsbn(e.target.value)} />
                                <button type="button" onClick={() => setIsScanning(true)} className="btn btn-secondary" title="Escanear con Cámara" style={{padding: '0 10px'}}>
                                    <Camera size={16}/>
                                </button>
                                <button type="button" onClick={buscarISBN} className="btn btn-secondary" title="Autocompletar vía ISBN" style={{padding: '0 10px'}}>
                                    <Search size={16}/>
                                </button>
                            </div>
                        </div>
                        <div className="form-group" style={{marginBottom: 0, gridColumn: 'span 2'}}>
                            <label>Título del Libro *</label>
                            <input className="form-control" placeholder="Ej. Don Quijote" value={titulo} onChange={e => setTitulo(e.target.value)} required />
                        </div>
                        <div className="form-group" style={{marginBottom: 0}}>
                            <label>Autor</label>
                            <input className="form-control" placeholder="Miguel de Cervantes" value={autor} onChange={e => setAutor(e.target.value)} />
                        </div>
                        <div className="form-group" style={{marginBottom: 0}}>
                            <label>Editorial</label>
                            <input type="text" className="form-control" placeholder="Alfaguara" value={editorial} onChange={e => setEditorial(e.target.value)} />
                        </div>
                        <div className="form-group" style={{marginBottom: 0}}>
                            <label>Año</label>
                            <input type="text" className="form-control" placeholder="2005" value={anio} onChange={e => setAnio(e.target.value)} />
                        </div>
                        <div className="form-group" style={{marginBottom: 0}}>
                            <label>Edición</label>
                            <input type="text" className="form-control" placeholder="1ra, 2da..." value={edicion} onChange={e => setEdicion(e.target.value)} />
                        </div>
                        <div className="form-group" style={{marginBottom: 0}}>
                            <label>Cantidad *</label>
                            <input type="number" min="1" className="form-control" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))} required />
                        </div>
                        
                        <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
                            <button type="submit" className="btn btn-primary btn-block">
                                <Plus size={18}/> Guardar Libro en Inventario
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {isScanning && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                }}>
                    <div className="card" style={{width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '20px', position: 'relative'}}>
                        <button onClick={() => setIsScanning(false)} style={{position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                            <X size={24}/>
                        </button>
                        <h3 style={{marginTop: 0, marginBottom: '20px'}}>Escanear ISBN</h3>
                        <div id="reader" style={{width: '100%'}}></div>
                        <button onClick={() => setIsScanning(false)} className="btn btn-secondary btn-block" style={{marginTop: '20px'}}>Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookEntry;
