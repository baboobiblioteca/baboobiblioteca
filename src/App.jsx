import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import { ProtectedRoute, AdminRoute, Login } from './components/Login';
import Layout from './components/Layout';
import { ToastProvider } from './services/ToastContext';

// Pages
import Home from './pages/Home';
import Sectors from './pages/Sectors';
import Schools from './pages/Schools';
import Pavilions from './pages/Pavilions';
import Backpacks from './pages/Backpacks';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import Books from './pages/Books';
import BookEntry from './pages/BookEntry';
import BookLoans from './pages/BookLoans';
import BorrowHistory from './pages/BorrowHistory';
import Readers from './pages/Readers';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rutas Protegidas que usan el Layout principal */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/sectors" element={<Sectors />} />
              <Route path="/schools" element={<Schools />} />
              <Route path="/pavilions" element={<Pavilions />} />
              <Route path="/backpacks" element={<Backpacks />} />
              <Route path="/books" element={<Books />} />
              <Route path="/books/add" element={<BookEntry />} />
              <Route path="/book-loans" element={<BookLoans />} />
              <Route path="/book-loans/history" element={<BorrowHistory />} />
              <Route path="/readers" element={<Readers />} />
              <Route path="/transactions" element={<Transactions />} />
              
              {/* Solo Admin */}
              <Route element={<AdminRoute />}>
                <Route path="/users" element={<Users />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
