import React, { useState, useRef } from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import { uploadAvatar } from '../../services/api';
import { toast } from 'sonner';

import logo from '../../assets/images/logo.png';
import logoWhite from '../../assets/images/logo-white.png';

const AppNavbar = () => {
  const { token, user, logout, updateUserSession } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('avatar', file);
    const toastId = toast.loading('Subiendo foto...');
    try {
      const response = await uploadAvatar(formData);
      if (response.ok && response.avatar) {
        updateUserSession({ ...user, avatar: response.avatar });
        toast.success('Foto de perfil actualizada', { id: toastId });
      } else {
        throw new Error('No se recibió la URL del avatar');
      }
    } catch (err) {
      toast.error('Error al subir la imagen', { id: toastId });
    }
    // Limpiar input para permitir re-selección del mismo archivo
    e.target.value = '';
  };

  const handleLogout = () => {
    setExpanded(false);
    logout();
    navigate('/login');
  };

  // Cierra el menú al navegar
  const closeMenu = () => setExpanded(false);

  const isLogged = !!token;
  const navbarBg = isLogged ? 'primary' : 'white';
  const logoSrc = isLogged ? logoWhite : logo;
  const navbarVariant = isLogged ? 'dark' : 'light';

  return (
    <Navbar
      bg={navbarBg}
      variant={navbarVariant}
      expand="false"
      expanded={expanded}
      onToggle={(val) => setExpanded(val)}
      className={`shadow-sm py-3 fixed-top ${isLogged ? 'text-white' : ''}`}
    >
      <Container className="px-3" fluid="xl">
        {/* IZQUIERDA: LOGO */}
        <Navbar.Brand as={Link} to="/" onClick={closeMenu} className="d-flex align-items-center me-auto p-0 m-0">
          <img src={logoSrc} alt="Alyto" style={{ height: '35px', objectFit: 'contain' }} />
        </Navbar.Brand>

        {/* DERECHA: Íconos y menú */}
        <div className="d-flex align-items-center gap-3">
          {isLogged && (
            <>
              {/* 👁️ Ocultar Saldos */}
              <i className="bi bi-eye text-white fs-5" style={{ cursor: 'pointer' }}></i>
              {/* 🔔 Campana de Notificaciones */}
              <NotificationBell color="white" />
            </>
          )}

          {/* 🍔 Menú Hamburguesa */}
          {!isLogged ? (
            <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0 px-1" />
          ) : (
            <Navbar.Toggle aria-controls="logged-navbar-nav" className="border-0 px-1 text-white shadow-none">
              <i className="bi bi-list fs-2 text-white"></i>
            </Navbar.Toggle>
          )}
        </div>

        {/* CONTENIDO DEL MENÚ — GUESTS */}
        {!isLogged && (
          <Navbar.Collapse id="basic-navbar-nav" className="pt-3">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/login" onClick={closeMenu} className="mb-2">Iniciar Sesión</Nav.Link>
              <Nav.Link as={Link} to="/register" onClick={closeMenu} className="mb-2">Registrarse</Nav.Link>
              <Button as={Link} to="/" onClick={closeMenu} variant="primary" className="fw-bold mt-2">
                Cotizar Envíos
              </Button>
            </Nav>
          </Navbar.Collapse>
        )}

        {/* CONTENIDO DEL MENÚ — LOGUEADOS */}
        {isLogged && (
          <Navbar.Collapse id="logged-navbar-nav" className="pt-3">
            <Nav className="ms-auto text-end bg-primary pb-4 border-top border-light mt-3 shadow-lg rounded-bottom">

              {/* Cabecera de Perfil — muestra foto si existe */}
              <div
                className="d-flex align-items-center justify-content-end mb-3 pt-4 px-4 bg-dark bg-opacity-10"
                style={{ cursor: 'pointer' }}
                onClick={() => { navigate('/profile'); closeMenu(); }}
              >
                <div className="text-end me-3 pb-3">
                  <div className="text-white fw-bold" style={{ fontSize: '1.15rem' }}>{user?.name}</div>
                  <div className="text-white-50 small">{user?.email}</div>
                  <div className="text-warning small mt-1" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-pencil-fill me-1"></i>Editar perfil
                  </div>
                </div>

                {/* Avatar con botón de cámara */}
                <div className="position-relative flex-shrink-0 mb-3" style={{ width: 52, height: 52 }}>
                  <div
                    className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center border border-2 border-white shadow w-100 h-100"
                    style={{ backgroundColor: user?.avatar ? 'transparent' : '#F7C843' }}
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="fw-bold text-dark" style={{ fontSize: '1.4rem' }}>
                        {user?.name?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  {/* Botón cámara — badge inferior derecho */}
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="position-absolute border-0 rounded-circle d-flex align-items-center justify-content-center shadow"
                    style={{ width: 22, height: 22, bottom: 0, right: 0, background: '#F7C843', cursor: 'pointer', padding: 0 }}
                    title="Cambiar foto"
                  >
                    <i className="bi bi-camera-fill" style={{ fontSize: '0.6rem', color: '#1a1a1a' }}></i>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="d-none"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              {/* Opciones Principales */}
              <div className="px-4 mt-2">
                <Nav.Link as={Link} to="/profile" onClick={closeMenu} className="text-white py-2 d-flex justify-content-end align-items-center fs-6">
                  Mi Perfil <i className="bi bi-person-badge ms-3 fs-5"></i>
                </Nav.Link>
                <Nav.Link as={Link} to="/favorites" onClick={closeMenu} className="text-white py-2 d-flex justify-content-end align-items-center fs-6">
                  Mis Contactos <i className="bi bi-star ms-3 fs-5"></i>
                </Nav.Link>
                <Nav.Link as={Link} to="/transactions" onClick={closeMenu} className="text-white py-2 d-flex justify-content-end align-items-center fs-6">
                  Historial de Envíos <i className="bi bi-card-list ms-3 fs-5"></i>
                </Nav.Link>
              </div>

              {/* Admin Links */}
              {user?.role === 'admin' && (
                <div className="bg-dark bg-opacity-25 mt-3 pt-3 pb-3 px-4 rounded-start ms-4">
                  <div className="text-white-50 small mb-3 text-uppercase fw-bold d-flex justify-content-end align-items-center" style={{ letterSpacing: '1px' }}>
                    Gestión Admin <i className="bi bi-shield-lock-fill ms-2"></i>
                  </div>
                  <Nav.Link as={Link} to="/admin/treasury" onClick={closeMenu} className="text-white py-2 d-flex justify-content-end align-items-center">Tesorería <i className="bi bi-safe ms-3"></i></Nav.Link>
                  <Nav.Link as={Link} to="/admin/rules" onClick={closeMenu} className="text-white py-2 d-flex justify-content-end align-items-center">Reglas <i className="bi bi-sliders ms-3"></i></Nav.Link>
                  <Nav.Link as={Link} to="/admin/markup" onClick={closeMenu} className="text-white py-2 d-flex justify-content-end align-items-center">Márgenes <i className="bi bi-percent ms-3"></i></Nav.Link>
                  <Nav.Link as={Link} to="/admin/users" onClick={closeMenu} className="text-white py-2 d-flex justify-content-end align-items-center">Usuarios <i className="bi bi-people ms-3"></i></Nav.Link>
                  <Nav.Link as={Link} to="/admin/kyc" onClick={closeMenu} className="text-warning fw-bold py-2 d-flex justify-content-end align-items-center">Revisar KYC <i className="bi bi-person-vcard ms-3"></i></Nav.Link>
                </div>
              )}

              {/* Cerrar Sesión */}
              <div className="px-4 mt-4 mb-2">
                <Button variant="danger" className="w-100 fw-bold d-flex justify-content-center align-items-center py-2 shadow-sm rounded-pill" onClick={handleLogout}>
                  <i className="bi bi-power me-2 fs-5"></i> Cerrar Sesión de Forma Segura
                </Button>
              </div>

            </Nav>
          </Navbar.Collapse>
        )}

      </Container>
    </Navbar>
  );
};

export default AppNavbar;
