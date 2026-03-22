
import React from 'react';
import { Container, Row, Col, Image, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import RemittanceSteps from '../components/remittance/RemittanceSteps';
import { useAuth } from '../context/AuthContext';
import ExchangeRateCarousel from '../components/ExchangeRateCarousel';
import BobRatePulse from '../components/BobRatePulse';
import homeBackgroundImage from '../assets/home-background.jpg';
import logo from '../assets/images/logo-white.png';
import logoOriginal from '../assets/images/logo.png';
import NotificationBell from '../components/ui/NotificationBell';

import { toast } from 'sonner';

// URLs de los assets
const googlePlayUrl = 'https://play.google.com/intl/en_us/badges/static/images/badges/es_badge_web_generic.png';
const appStoreUrl = 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg';

const Home = () => {
  const { token, user, logout, updateUserSession } = useAuth();

  // --- STATES FOR REAL DATA ---
  const [transactions, setTransactions] = React.useState([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const [showBalance, setShowBalance] = React.useState(true);

  React.useEffect(() => {
    if (token) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          // Fetch transactions with robust handling
          const api = await import('../services/api');
          const response = await api.getTransactions({ limit: 20 });
          console.log("📊 Dashboard Content:", response);

          let dataList = [];
          if (Array.isArray(response)) {
            dataList = response;
          } else if (Array.isArray(response?.data)) {
            dataList = response.data;
          } else if (Array.isArray(response?.transactions)) {
            dataList = response.transactions;
          }

          // Sort by created_at desc if not sorted (frontend fallback)
          if (dataList.length > 0 && dataList[0]?.created_at) {
            dataList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          }

          setTransactions(dataList);
        } catch (error) {
          console.error("❌ Error loading dashboard:", error);
        } finally {
          setLoadingData(false);
        }
      };

      fetchData();
    }
  }, [token]);

  // --- VIEW: LOGGED IN (ALYTO APP BAR DESIGN) ---
  if (token) {
    // Current Date formatted like "14 Oktober 2024"
    const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <div style={{
        backgroundColor: '#F8F9FD',
        minHeight: '100vh',
        position: 'relative',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
        overflowX: 'hidden',
        maxWidth: '100%'
      }}>

        <div style={{
          position: 'absolute', top: 0, left: 0, width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(35,62,88,0.1) 0%, rgba(255,255,255,0) 70%)',
          filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none'
        }}></div>

        <Container className="py-2 pb-5 position-relative" style={{ zIndex: 1, maxWidth: '600px' }}>

          {/* 1. USER PROFILE (Left/Right Layout) */}
          <div className="d-flex justify-content-between align-items-center mb-4 px-2 mt-4">

            {/* Texts (Left) */}
            <div className="text-start">
              <h2 className="fw-bold mb-1 text-dark" style={{ fontSize: '1.6rem', letterSpacing: '-0.5px' }}>
                Hola, {user?.name?.split(' ')[0] || 'Usuario'} 👋
              </h2>
              <p className="text-muted mb-0 small">{today}</p>
            </div>

            {/* Avatar (Right) */}
            <div className="position-relative shadow-sm rounded-circle" style={{ width: '105px', height: '105px', flexShrink: 0 }}>
              <label
                htmlFor="profile-upload"
                className="rounded-circle d-flex align-items-center justify-content-center overflow-hidden border border-2 border-white bg-light cursor-pointer"
                style={{ width: '100%', height: '100%', cursor: 'pointer' }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="fw-bold fs-2 text-secondary">{user?.name?.charAt(0) || 'U'}</span>
                )}

                {/* Overlay Icon for Edit */}
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-25 opacity-0 hover-opacity-100 transition-opacity">
                  <i className="bi bi-camera-fill text-white fs-4"></i>
                </div>
              </label>
              <input
                id="profile-upload"
                type="file"
                className="d-none"
                accept="image/*"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("La imagen no debe superar los 5MB");
                      return;
                    }
                    const formData = new FormData();
                    formData.append('avatar', file);
                    const toastId = toast.loading("Subiendo foto de perfil...");
                    try {
                      const { uploadAvatar } = await import('../services/api');
                      const response = await uploadAvatar(formData);
                      if (response.ok && response.avatar) {
                        const updatedUser = { ...user, avatar: response.avatar };
                        updateUserSession(updatedUser);
                        toast.success("Foto de perfil actualizada", { id: toastId });
                      } else {
                        throw new Error('No se recibió la URL del avatar');
                      }
                    } catch (error) {
                      console.error("Error updating avatar:", error);
                      toast.error("Error al subir la imagen", { id: toastId });
                    }
                  }
                }}
              />
            </div>
          </div>


          {/* Exchange Rate Pulses: CLP and BOB */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            justifyContent: 'center',
            width: '100%',
            overflow: 'hidden'
          }}>
            <div style={{ flex: '0 0 auto', width: '44%', maxWidth: '150px' }}>
              <ExchangeRateCarousel />
            </div>
            <div style={{ flex: '0 0 auto', width: '44%', maxWidth: '150px' }}>
              <BobRatePulse />
            </div>
          </div>

          {/* 3. ACTION GRID (4 Buttons with Custom SVGs) */}
          <div className="d-flex justify-content-between mb-4 px-2">
            {/* Transfer (Send) - MOVED TO FIRST POSITION */}
            <Link to="/send" className="text-decoration-none text-center">
              <div className="rounded-circle d-flex align-items-center justify-content-center mb-2 mx-auto shadow-sm transition-hover"
                style={{ width: 60, height: 60, backgroundColor: '#233E58', color: 'white' }}>
                {/* Icon: Paper Plane */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '-2px', marginTop: '2px' }}>
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </div>
              <small className="fw-bold text-dark" style={{ fontSize: '0.75rem' }}>Enviar</small>
            </Link>

            {/* Share App - MOVED TO SECOND POSITION */}
            <div className="text-center" style={{ cursor: 'pointer' }} onClick={() => {
              const shareData = {
                title: 'Alyto - Transferencias al instante',
                text: '¡Prueba Alyto para enviar dinero de forma rápida y segura!',
                url: window.location.origin
              };

              // Try native share API first
              if (navigator.share) {
                navigator.share(shareData).catch(() => {
                  // Fallback to WhatsApp
                  window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`, '_blank');
                });
              } else {
                // Direct to WhatsApp
                window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`, '_blank');
              }
            }}>
              <div className="rounded-circle d-flex align-items-center justify-content-center mb-2 mx-auto shadow-sm transition-hover"
                style={{ width: 60, height: 60, backgroundColor: '#F7C843', color: 'white' }}>
                {/* Icon: Share */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
              </div>
              <small className="fw-bold text-dark" style={{ fontSize: '0.75rem' }}>Compartir</small>
            </div>

            {/* Add Contact */}
            <Link to="/favorites" className="text-decoration-none text-center">
              <div className="rounded-circle d-flex align-items-center justify-content-center mb-2 mx-auto shadow-sm transition-hover"
                style={{ width: 60, height: 60, backgroundColor: '#20c997', color: 'white' }}>
                {/* Icon: User Plus */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
              </div>
              <small className="fw-bold text-dark" style={{ fontSize: '0.75rem' }}>Contacto</small>
            </Link>

            {/* Historial */}
            <Link to="/transactions" className="text-decoration-none text-center">
              <div className="rounded-circle d-flex align-items-center justify-content-center mb-2 mx-auto shadow-sm transition-hover"
                style={{ width: 60, height: 60, backgroundColor: '#fd7e14', color: 'white' }}>
                {/* Icon: Receipt/History */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <small className="fw-bold text-dark" style={{ fontSize: '0.75rem' }}>Historial</small>
            </Link>
          </div>

          {/* REPORTE FINANCIERO — pendiente de definición, temporalmente oculto */}
          {/* <div className="card border-0 mb-4 overflow-hidden shadow-sm" ... > ... </div> */}


          {/* 5. TRANSACTION LIST */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold m-0 text-dark">Transacciones</h5>
              <Link to="/transactions" className="text-decoration-none small text-muted">Ver todas</Link>
            </div>

            <div className="d-flex flex-column gap-3">
              {loadingData ? (
                <div className="text-center py-4"><span className="spinner-border text-primary"></span></div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-4 text-muted bg-white rounded-4 shadow-sm">
                  <i className="bi bi-receipt fs-1 mb-2 d-block opacity-50"></i>
                  <span className="small">Sin movimientos aún</span>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx._id || tx.id} className="d-flex align-items-center bg-transparent border-0 py-1">
                    {/* Icon */}
                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0 shadow-sm"
                      style={{
                        width: 50,
                        height: 50,
                        background: 'linear-gradient(135deg, rgba(35,62,88,0.15) 0%, rgba(35,62,88,0.25) 100%)'
                      }}>
                      {/* Paper plane icon in white */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-grow-1">
                      <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                        {tx.company_name ||
                          (tx.beneficiary_first_name && tx.beneficiary_last_name
                            ? `${tx.beneficiary_first_name} ${tx.beneficiary_last_name}`
                            : 'Envío')}
                      </h6>
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(tx.createdAt).toLocaleDateString('es-CL')} • {new Date(tx.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>

                    {/* Amount & Status */}
                    <div className="text-end">
                      <span className="fw-bold d-block text-danger">
                        - ${Math.abs(tx.amount).toLocaleString('es-CL')}
                      </span>
                      <span className={`badge rounded-pill ${tx.status === 'succeeded' ? 'bg-success-subtle text-success' :
                        (tx.status === 'pending' || tx.status === 'processing' ||
                          tx.status?.includes('pending') || tx.status === 'created') ? 'bg-warning-subtle text-warning' :
                          'bg-danger-subtle text-danger'
                        }`} style={{ fontSize: '0.65rem', padding: '0.3em 0.8em' }}>
                        {tx.status === 'succeeded' ? 'Exitoso' :
                          (tx.status === 'pending' || tx.status === 'processing' ||
                            tx.status?.includes('pending') || tx.status === 'created') ? 'Pendiente' :
                            'Fallido'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </Container>
      </div>
    );
  }

  // --- VIEW: GUEST (LANDING PAGE) ---
  return (
    <>
      {/* Hero Section - Clean White Background */}
      <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', display: 'flex', alignItems: 'center', paddingTop: '80px' }}>
        <Container className="py-5">
          <Row className="align-items-center justify-content-center">

            {/* Columna Izquierda: Texto y Logo */}
            <Col lg={5} className="mb-5 mb-lg-0 text-center text-lg-start">
              <div className="mb-4">
                {/* Logo Vistoso - Solo visible en Desktop (d-none d-lg-inline-block) */}
                <div className="d-none d-lg-inline-block">
                  <Image src={logoOriginal} alt="Alyto" style={{ height: '80px' }} className="mb-4" />
                </div>
              </div>

              <h1 className="display-4 fw-bold mb-3" style={{ color: '#233E58', lineHeight: '1.2' }}>
                Transferencias <span style={{ color: '#F7C843' }}>al instante</span> con<br className="d-md-none" /> tecnología Blockchain
              </h1>
              <p className="lead mb-5 text-muted">
                La forma más segura y rápida de enviar dinero. Conectamos fronteras usando la red Stellar.
              </p>

              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
                <Button as={Link} to="/register" variant="primary" size="lg" className="fw-bold px-4 rounded-pill">
                  Empezar ahora
                </Button>
                <Button as={Link} to="/login" variant="outline-primary" size="lg" className="fw-bold px-4 rounded-pill">
                  Iniciar Sesión
                </Button>
              </div>

              <div className="mt-5">
                <p className="small text-muted mb-2">Descarga nuestra App</p>
                <div className="d-flex align-items-center justify-content-center justify-content-lg-start gap-3">
                  <a href="#"><Image src={googlePlayUrl} alt="Google Play" style={{ height: '40px' }} /></a>
                  <a href="#"><Image src={appStoreUrl} alt="App Store" style={{ height: '40px' }} /></a>
                </div>
              </div>
            </Col>

            {/* Columna Derecha: COTIZADOR EXPANDIDO */}
            <Col lg={6} className="offset-lg-1">
              <div className="shadow-lg p-3 rounded-4 bg-white border">
                <RemittanceSteps />
              </div>
            </Col>

          </Row>
        </Container>
      </div>

      {/* --- SECCIÓN FEATURES (Stellar & Blockchain) --- */}
      <div className="bg-light py-5">
        <Container>
          <div className="text-center mb-5">
            <h2 className="fw-bold">¿Por qué elegir Alyto?</h2>
            <p className="text-muted">Innovación financiera a tu alcance</p>
          </div>
          <Row className="g-4">
            <Col md={4}>
              <div className="card h-100 p-4 border-0 shadow-sm text-center">
                <div className="mb-3 text-primary">
                  <i className="bi bi-shield-check fs-1"></i>
                </div>
                <h4>Seguridad Stellar</h4>
                <p className="text-muted small">
                  Cada transacción es validada en la red Stellar, garantizando inmutabilidad y transparencia total.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="card h-100 p-4 border-0 shadow-sm text-center">
                <div className="mb-3 text-accent">
                  <i className="bi bi-clock-history fs-1"></i>
                </div>
                <h4>Velocidad Real</h4>
                <p className="text-muted small">
                  Olvídate de esperar días. La tecnología blockchain permite liquidación en segundos, 24/7.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="card h-100 p-4 border-0 shadow-sm text-center">
                <div className="mb-3 text-primary">
                  <i className="bi bi-globe fs-1"></i>
                </div>
                <h4>Sin Fronteras</h4>
                <p className="text-muted small">
                  Acceso global con comisiones justas. Tu dinero llega íntegro a su destino.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

export default Home;