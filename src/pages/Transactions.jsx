import React, { useState, useEffect } from 'react';
import { Container, Card, Spinner, Alert, Badge, Form, Row, Col, Pagination, Table, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getTransactions } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/logo.png';
import ReceiptModal from '../components/ReceiptModal';

// Import flags
import flagCL from '../assets/flags/cl.svg';
import flagCO from '../assets/flags/co.svg';
import flagBO from '../assets/flags/bo.svg';
import flagPE from '../assets/flags/pe.svg';
import flagMX from '../assets/flags/mx.svg';
import flagVE from '../assets/flags/ve.svg';
import flagBR from '../assets/flags/br.svg';
import flagAR from '../assets/flags/ar.svg';
import flagUS from '../assets/flags/us.svg';
import flagCR from '../assets/flags/cr.svg';
import flagDO from '../assets/flags/do.svg';
import flagEC from '../assets/flags/ec.svg';
import flagES from '../assets/flags/es.svg';
import flagEU from '../assets/flags/eu.svg';
import flagGB from '../assets/flags/gb.svg';
import flagGT from '../assets/flags/gt.svg';
import flagHT from '../assets/flags/ht.svg';
import flagPA from '../assets/flags/pa.svg';
import flagPL from '../assets/flags/pl.svg';
import flagPY from '../assets/flags/py.svg';
import flagSV from '../assets/flags/sv.svg';
import flagUY from '../assets/flags/uy.svg';
import flagAU from '../assets/flags/au.svg';
import flagCN from '../assets/flags/cn.svg';

const FLAGS = {
  CL: flagCL, CO: flagCO, BO: flagBO, PE: flagPE, MX: flagMX, VE: flagVE,
  BR: flagBR, AR: flagAR, US: flagUS, CR: flagCR, DO: flagDO, EC: flagEC,
  ES: flagES, EU: flagEU, GB: flagGB, GT: flagGT, HT: flagHT, PA: flagPA,
  PL: flagPL, PY: flagPY, SV: flagSV, UY: flagUY, AU: flagAU, CN: flagCN
};

const TRANSACTIONS_PER_PAGE = 10; // Número de transacciones por página

const Transactions = () => {
  const { countries, loading: loadingCountries } = useAppContext();
  const { user } = useAuth(); // Obtiene el usuario actual para verificar rol
  const isAdmin = user?.role === 'admin'; // Determina si es administrador

  // Estados del componente
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState({ status: '', country: '' });

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const getFlagUrl = (code) => FLAGS[code?.toUpperCase()] || '';

  // Convierte código de mercado/país a ISO de moneda ("CL" → "CLP", "BO" → "BOB", etc.)
  const COUNTRY_TO_CURRENCY = {
    CL: 'CLP', CO: 'COP', AR: 'ARS', MX: 'MXN', BR: 'BRL', PE: 'PEN',
    BO: 'BOB', VE: 'VES', EC: 'USD', PA: 'USD', GT: 'GTQ', SV: 'USD',
    DO: 'DOP', CR: 'CRC', PY: 'PYG', UY: 'UYU', US: 'USD', EU: 'EUR',
    GB: 'GBP', PL: 'PLN', AU: 'AUD', CN: 'CNY', HT: 'HTG'
  };
  const toCurrencyCode = (code) => COUNTRY_TO_CURRENCY[code?.toUpperCase()] || code || '';

  // Efecto para cargar las transacciones cuando cambian los filtros o la página
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(''); // Limpia errores anteriores
        const activeFilters = { ...filters };
        // Limpia filtros vacíos para no enviarlos a la API
        if (!activeFilters.status) delete activeFilters.status;
        if (!activeFilters.country) delete activeFilters.country;

        const response = await getTransactions({
          page: currentPage,
          limit: TRANSACTIONS_PER_PAGE,
          ...activeFilters
        });

        // Robust Response Handling
        let txList = [];
        let totalCount = 0;

        if (Array.isArray(response)) {
          // Direct Array Response
          txList = response;
          totalCount = response.length;
        } else if (response?.transactions && Array.isArray(response.transactions)) {
          // Object with transactions key
          txList = response.transactions;
          totalCount = response.total || response.transactions.length;
        } else if (response?.data && Array.isArray(response.data)) {
          // Object with data key
          txList = response.data;
          totalCount = response.total || response.data.length;
        } else if (response?.ok && Array.isArray(response?.data)) {
          // Wrapper with ok: true
          txList = response.data;
          totalCount = response.total || response.data.length;
        }

        // Only if we found nothing and response was an object implying failure? 
        // But getTransactions throws on http error. So if we are here, we likely have success or empty structure.

        setTransactions(txList);
        setTotalPages(totalCount > 0 ? Math.ceil(totalCount / TRANSACTIONS_PER_PAGE) : 1);
      } catch (err) {
        setError(err.message || 'No se pudieron cargar las transacciones.');
        setTransactions([]); // Limpia en caso de error
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [filters, currentPage]); // Dependencias: se ejecuta si cambian filtros o página

  // Manejador para cambios en los selectores de filtro
  const handleFilterChange = (e) => {
    setCurrentPage(1); // Vuelve a la primera página al aplicar un nuevo filtro
    const { name, value } = e.target;
    setFilters(prevFilters => ({ ...prevFilters, [name]: value }));
  };

  // Manejador para cambios de página en la paginación
  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  // Handle view receipt
  const handleViewReceipt = (tx) => {
    setSelectedTransaction(tx);
    setShowReceiptModal(true);
  };

  // Función auxiliar para obtener el estilo del Badge según el estado
  const getStatusBadge = (status) => {
    switch (status) {
      case 'succeeded': return <Badge bg="success">Completado</Badge>;
      case 'pending': return <Badge bg="warning">Pendiente</Badge>;
      case 'pending_verification': return <Badge bg="warning" text="dark">En Verificación</Badge>;
      case 'pending_manual_payout': return <Badge bg="warning" text="dark">Pago Manual</Badge>;
      case 'claiming': return <Badge bg="info">Reclamando</Badge>;
      case 'processing': return <Badge bg="info">Procesando</Badge>;
      case 'failed': return <Badge bg="danger">Fallido</Badge>;
      case 'cancelled': return <Badge bg="secondary">Cancelado</Badge>;
      default: return <Badge bg="secondary">{status || 'Desconocido'}</Badge>;
    }
  };

  // Función principal para renderizar el contenido (lista o tabla)
  const renderContent = () => {
    if (loading) {
      return <div className="text-center p-5"><Spinner animation="border" /></div>;
    }
    if (error) {
      return <Alert variant="danger">{error}</Alert>;
    }
    if (transactions.length === 0) {
      return <Alert variant="info">No se encontraron transacciones con los filtros actuales.</Alert>;
    }

    // --- Renderizado Condicional: Tabla para Admin, Cards para Usuario ---
    if (isAdmin) {
      return (
        <Table striped bordered hover responsive size="sm" className="mt-3">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Orden ID</th>
              <th>Remitente</th>
              <th>Beneficiario</th>
              <th>País</th>
              <th>Enviado</th>
              <th>Recibido</th>
              <th>Tasa Vita</th>
              <th>Tasa Alyto</th>
              <th>Ganancia</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx._id}>
                <td>{new Date(tx.createdAt).toLocaleString('es-CL', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td><code className="small">{tx.order}</code></td>
                <td className="small">{tx.createdBy?.name || tx.createdBy?.email || 'N/A'}</td>
                <td className="small">{tx.company_name || `${tx.beneficiary_first_name || ''} ${tx.beneficiary_last_name || ''}`.trim()}</td>
                <td>{tx.country}</td>

                {/* Enviado */}
                <td className="text-end">
                  {tx.amountsTracking?.originTotal ? (
                    <><strong>{new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(tx.amountsTracking.originTotal)}</strong> <small className="text-muted">{tx.amountsTracking.originCurrency}</small></>
                  ) : (
                    <>{new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(tx.amount || 0)} <small className="text-muted">{tx.currency}</small></>
                  )}
                </td>

                {/* Recibido */}
                <td className="text-end">
                  {tx.amountsTracking?.destReceiveAmount ? (
                    <><strong>{new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(tx.amountsTracking.destReceiveAmount)}</strong> <small className="text-muted" translate="no">{toCurrencyCode(tx.amountsTracking.destCurrency)}</small></>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>

                {/* Tasa Vita */}
                <td className="small text-muted text-center">
                  {(() => {
                    const r = tx.rateTracking;
                    if (!r?.vitaRate) return '-';
                    const origCurr = tx.amountsTracking?.originCurrency || tx.currency || 'CLP';
                    const destCurr = tx.amountsTracking?.destCurrency || '';
                    // Format with enough decimals: BOB→COP rates are ~400, CLP→COP are ~4.x
                    const decimals = r.vitaRate >= 100 ? 2 : 4;
                    return (
                      <span title={`Tasa pura de Vita: 1 ${origCurr} = ${r.vitaRate.toFixed(decimals)} ${destCurr}`}>
                        {r.vitaRate.toFixed(decimals)}
                      </span>
                    );
                  })()}
                </td>

                {/* Tasa Alyto */}
                <td className="small text-center">
                  {(() => {
                    const r = tx.rateTracking;
                    if (!r?.alytoRate) return '-';
                    const origCurr = tx.amountsTracking?.originCurrency || tx.currency || 'CLP';
                    const destCurr = tx.amountsTracking?.destCurrency || '';
                    const decimals = r.alytoRate >= 100 ? 2 : 4;
                    const spread = r.spreadPercent || (r.vitaRate && r.alytoRate ? ((1 - r.alytoRate / r.vitaRate) * 100).toFixed(1) : null);
                    return (
                      <strong title={`Tasa Alyto: 1 ${origCurr} = ${r.alytoRate.toFixed(decimals)} ${destCurr}${spread ? ` | Spread: ${spread}%` : ''}`}>
                        {r.alytoRate.toFixed(decimals)}
                        {spread ? <small className="text-muted fw-normal"> ({spread}%)</small> : null}
                      </strong>
                    );
                  })()}
                </td>

                {/* Ganancia */}
                <td className="text-end">
                  {(() => {
                    const at = tx.amountsTracking || {};
                    const isBOB = (at.originCurrency || tx.currency || '').toUpperCase() === 'BOB';

                    // Para BOB: la ganancia real está en tx.fee (marginCLP = diferencial BOB→CLP)
                    // profitOriginCurrency en amountsTracking es la ganancia del WALLET (≈0, break-even por diseño)
                    // Para CLP: la ganancia está en amountsTracking.profitOriginCurrency
                    const profitCLP = isBOB
                      ? (tx.fee || 0)
                      : (at.profitOriginCurrency || 0);

                    const profitDest = at.profitDestCurrency || 0;
                    const destCurr = at.destCurrency || '';

                    if (!profitCLP && !profitDest) {
                      return <span className="text-muted">-</span>;
                    }

                    const fmtCLP = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(profitCLP);
                    const fmtDest = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(profitDest);
                    const tooltip = isBOB
                      ? `${fmtCLP} CLP (diferencial tasa BOB→CLP)${profitDest ? ` ≈ ${fmtDest} ${destCurr}` : ''}`
                      : `${fmtCLP} CLP${profitDest ? ` ≈ ${fmtDest} ${destCurr}` : ''}`;

                    return (
                      <span className="text-success fw-bold" title={tooltip}>
                        {fmtCLP} <small className="text-muted fw-normal">CLP</small>
                        {profitDest > 0 && (
                          <div className="text-muted fw-normal" style={{ fontSize: '0.72rem' }}>
                            ≈ {fmtDest} {destCurr}
                          </div>
                        )}
                      </span>
                    );
                  })()}
                </td>


                <td>
                  {tx.paymentMethod === 'manual_anchor' && (
                    <Badge bg="warning" text="dark" className="me-1">🏦</Badge>
                  )}
                  {getStatusBadge(tx.status)}
                </td>
                <td>
                  <div className="d-flex gap-1">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => handleViewReceipt(tx)}
                      title="Ver Comprobante"
                    >
                      <i className="bi bi-receipt"></i>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      as={Link}
                      to={`/transactions/${tx._id}`}
                      title="Ver Detalles"
                    >
                      <i className="bi bi-eye"></i>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table >
      );
    } else {
      // Vista mejorada con cards para usuarios normales
      return (
        <div className="row g-3">
          {transactions.map(tx => (
            <div key={tx._id} className="col-12">
              <Card
                className="border-0 shadow-sm h-100 transition-shadow"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Card.Body className="p-3">
                  {(() => {
                    // Derive origin currency, flag and amount
                    const originCurrency = tx.amountsTracking?.originCurrency || tx.currency || 'CLP';
                    const originAmount = tx.amountsTracking?.originTotal ?? tx.amount ?? 0;
                    // Flag uses first 2 chars of ISO currency code ("BOB" → "BO", "CLP" → "CL")
                    const originFlagCode = originCurrency.length === 3 ? originCurrency.substring(0, 2) : originCurrency;

                    // Derive destination currency and amounts
                    const destCurrency = toCurrencyCode(tx.amountsTracking?.destCurrency || tx.country);
                    const destAmount = tx.amountsTracking?.destReceiveAmount || tx.vitaResponse?.estimated_amount;

                    // Mask account number (show last 4 chars)
                    const rawAccount = tx.withdrawalPayload?.beneficiary_bank_account || '';
                    const maskedAccount = rawAccount.length > 4
                      ? `****${rawAccount.slice(-4)}`
                      : rawAccount;

                    const bankName = tx.withdrawalPayload?.beneficiary_bank_name;
                    const benefName = tx.company_name || [tx.beneficiary_first_name, tx.beneficiary_last_name].filter(Boolean).join(' ');

                    return (
                      <>
                        {/* --- Status badge (title) --- */}
                        <div className="mb-2">
                          {tx.paymentMethod === 'manual_anchor' && (
                            <Badge bg="warning" text="dark" className="me-2">
                              <i className="bi bi-bank2"></i> Manual
                            </Badge>
                          )}
                          {getStatusBadge(tx.status)}
                        </div>

                        {/* --- Section 1: Reciben --- */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <div className="text-secondary mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reciben</div>
                            <div className="d-flex align-items-center gap-2">
                              <img
                                src={getFlagUrl(tx.country) || flagUS}
                                alt={tx.country}
                                style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              {destAmount ? (
                                <span className="fw-bold" style={{ fontSize: '1.15rem', color: '#00A89D' }} translate="no">
                                  {new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(destAmount)} {destCurrency}
                                </span>
                              ) : (
                                <span className="text-muted small">Pendiente</span>
                              )}
                            </div>
                          </div>
                          {/* Date/time on the right */}
                          <div className="text-end">
                            <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                              {new Date(tx.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </small>
                            <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                              {new Date(tx.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                        </div>

                        {/* --- Section 2: Enviaste --- */}
                        <div className="mb-3">
                          <div className="text-secondary mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Enviaste</div>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={getFlagUrl(originFlagCode) || flagCL}
                              alt={originCurrency}
                              style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <span className="fw-bold" style={{ color: '#233E58', fontSize: '1rem' }} translate="no">
                              {new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(originAmount)} {originCurrency}
                            </span>
                          </div>
                        </div>

                        {/* --- Section 3: Destinatario --- */}
                        {benefName && (
                          <div className="mb-3">
                            <div className="text-secondary mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destinatario</div>
                            <div className="fw-medium text-dark" style={{ fontSize: '0.9rem' }}>{benefName}</div>
                            {(maskedAccount || bankName) && (
                              <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                                {maskedAccount}{maskedAccount && bankName ? ' · ' : ''}{bankName}
                              </div>
                            )}
                          </div>
                        )}

                        {/* --- Separator --- */}
                        <hr className="my-2" style={{ borderColor: '#e9ecef' }} />

                        {/* --- Buttons: small, side by side --- */}
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={(e) => { e.stopPropagation(); handleViewReceipt(tx); }}
                            className="d-flex align-items-center gap-1 px-2 py-1"
                            style={{ fontSize: '0.78rem' }}
                          >
                            <i className="bi bi-receipt" style={{ fontSize: '0.8rem' }}></i>
                            Comprobante
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            as={Link}
                            to={`/transactions/${tx._id}`}
                            className="d-flex align-items-center gap-1 px-2 py-1"
                            style={{ fontSize: '0.78rem' }}
                          >
                            <i className="bi bi-info-circle" style={{ fontSize: '0.8rem' }}></i>
                            Detalles
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <Container className="my-4">
      {/* Logo Header */}
      <div className="text-center mb-4">
        <img src={logo} alt="Alyto" style={{ height: '90px' }} />
      </div>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom-0 py-3" style={{ borderRadius: '10px 10px 0 0' }}>
          <h4 className="fw-bold mb-0">
            Historial de Transacciones {isAdmin && <Badge bg="primary" className="ms-2">Admin</Badge>}
          </h4>
        </Card.Header>
        <Card.Body>
          {/* --- Formulario de Filtros --- */}
          <Form className="mb-4">
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Filtrar por Estado</Form.Label>
                  <Form.Select name="status" value={filters.status} onChange={handleFilterChange}>
                    <option value="">Todos</option>
                    <option value="pending">Pendiente</option>
                    <option value="pending_verification">En Verificación</option>
                    <option value="pending_manual_payout">Pago Manual</option>
                    <option value="claiming">Reclamando</option>
                    <option value="processing">Procesando</option>
                    <option value="succeeded">Completado</option>
                    <option value="failed">Fallido</option>
                    <option value="cancelled">Cancelado</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Filtrar por País</Form.Label>
                  <Form.Select name="country" value={filters.country} onChange={handleFilterChange} disabled={loadingCountries}>
                    <option value="">Todos</option>
                    {loadingCountries ? <option>Cargando...</option> : countries.map(country => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>

          {/* Renderiza la lista o la tabla */}
          {renderContent()}

          {/* --- Paginación --- */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.Prev
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                />
                {[...Array(totalPages).keys()].map(number => (
                  <Pagination.Item
                    key={number + 1}
                    active={number + 1 === currentPage}
                    onClick={() => handlePageChange(number + 1)}
                  >
                    {number + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Receipt Modal */}
      <ReceiptModal
        show={showReceiptModal}
        onHide={() => setShowReceiptModal(false)}
        transaction={selectedTransaction}
        orderId={selectedTransaction?.order}
      />
    </Container>
  );
};

export default Transactions;