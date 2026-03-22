import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, InputGroup, Button, Spinner, Alert, Modal, ListGroup, Accordion } from 'react-bootstrap';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getQuote, getTransactionRules, getEnabledOrigins } from '../../services/api';
import { formatNumberForDisplay, parseFormattedNumber, formatRate } from '../../utils/formatting';
import { BANK_EXAMPLES } from '../../data/bankExamples';
import logo from '../../assets/images/logo.png'; // Importación correcta del logo

// Import flags directly for better reliability
import flagCL from '../../assets/flags/cl.svg';
import flagCO from '../../assets/flags/co.svg';
import flagBO from '../../assets/flags/bo.svg';
import flagPE from '../../assets/flags/pe.svg';
import flagMX from '../../assets/flags/mx.svg';
import flagVE from '../../assets/flags/ve.svg';
import flagBR from '../../assets/flags/br.svg';
import flagAR from '../../assets/flags/ar.svg';
import flagUS from '../../assets/flags/us.svg';
import flagCR from '../../assets/flags/cr.svg';
import flagDO from '../../assets/flags/do.svg';
import flagEC from '../../assets/flags/ec.svg';
import flagES from '../../assets/flags/es.svg';
import flagEU from '../../assets/flags/eu.svg';
import flagGB from '../../assets/flags/gb.svg';
import flagGT from '../../assets/flags/gt.svg';
import flagHT from '../../assets/flags/ht.svg';
import flagPA from '../../assets/flags/pa.svg';
import flagPL from '../../assets/flags/pl.svg';
import flagPY from '../../assets/flags/py.svg';
import flagSV from '../../assets/flags/sv.svg';
import flagUY from '../../assets/flags/uy.svg';
import flagAU from '../../assets/flags/au.svg';
import flagCN from '../../assets/flags/cn.svg';

// Flag map for easy access
const FLAGS = {
  CL: flagCL,
  CO: flagCO,
  BO: flagBO,
  PE: flagPE,
  MX: flagMX,
  VE: flagVE,
  BR: flagBR,
  AR: flagAR,
  US: flagUS,
  CR: flagCR,
  DO: flagDO,
  EC: flagEC,
  ES: flagES,
  EU: flagEU,
  GB: flagGB,
  GT: flagGT,
  HT: flagHT,
  PA: flagPA,
  PL: flagPL,
  PY: flagPY,
  SV: flagSV,
  UY: flagUY,
  AU: flagAU,
  CN: flagCN
};

// Helper to get flag by country code
const getFlagUrl = (code) => {
  if (!code) return '';
  return FLAGS[code.toUpperCase()] || '';
};

// Country to Currency mapping (código de país → código de moneda)
const COUNTRY_TO_CURRENCY = {
  CL: 'CLP', CO: 'COP', AR: 'ARS', MX: 'MXN',
  BR: 'BRL', PE: 'PEN', BO: 'BOB', US: 'USD', VE: 'VES',
  CR: 'CRC', DO: 'DOP', EC: 'USD', ES: 'EUR', EU: 'EUR',
  GB: 'GBP', GT: 'GTQ', HT: 'HTG', PA: 'PAB', PL: 'PLN',
  PY: 'PYG', SV: 'USD', UY: 'UYU', AU: 'AUD', CN: 'CNY'
};

// Nombres completos de moneda en español (nunca depender del backend para los labels)
const CURRENCY_NAMES = {
  CLP: 'Peso Chileno',
  COP: 'Peso Colombiano',
  ARS: 'Peso Argentino',
  MXN: 'Peso Mexicano',
  BRL: 'Real Brasileño',
  PEN: 'Sol Peruano',
  BOB: 'Boliviano',
  USD: 'Dólar Estadounidense',
  VES: 'Bolívar Venezolano',
  CRC: 'Colón Costarricense',
  DOP: 'Peso Dominicano',
  EUR: 'Euro',
  GBP: 'Libra Esterlina',
  GTQ: 'Quetzal Guatemalteco',
  HTG: 'Gourde Haitiano',
  PAB: 'Balboa Panameño',
  PLN: 'Esloti Polaco',
  PYG: 'Guaraní Paraguayo',
  UYU: 'Peso Uruguayo',
  AUD: 'Dólar Australiano',
  CNY: 'Yuan Chino',
};

// Devuelve { code, name } para un país dado — nunca muestra garbage del API
const getCurrencyInfo = (countryCode) => {
  const code = COUNTRY_TO_CURRENCY[countryCode] || countryCode;
  const name = CURRENCY_NAMES[code] || code;
  return { code, name };
};

const CardForm = ({ onQuoteSuccess }) => {
  const { countries, loading: loadingCountries } = useAppContext();
  // ...
  const { user } = useAuth();
  // ...

  // --- Origin States ---
  const [originCountries, setOriginCountries] = useState([]);
  const [loadingOrigins, setLoadingOrigins] = useState(true);
  const [originCountry, setOriginCountry] = useState('CL'); // Default origin
  const [originCurrency, setOriginCurrency] = useState('CLP');

  // Form States
  const [amount, setAmount] = useState(0);
  const [displayAmount, setDisplayAmount] = useState('');
  const [destAmount, setDestAmount] = useState(0); // Para modo receive
  const [displayDestAmount, setDisplayDestAmount] = useState('');
  const [destCountry, setDestCountry] = useState('CO');
  const [mode, setMode] = useState('send'); // 'send' | 'receive'

  // Data & UI States
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Rules & Limits States
  const [minAmount, setMinAmount] = useState(5000);
  const [alertMessage, setAlertMessage] = useState('');
  const [limitError, setLimitError] = useState(false);

  // Modal States for Country Selection
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);

  // 1. Load Enabled Origin Countries
  useEffect(() => {
    const fetchOrigins = async () => {
      try {
        const res = await getEnabledOrigins();
        if (res.ok) {
          // --- CORRECCIÓN: Siempre actualizamos el estado, incluso si está vacío ---
          setOriginCountries(res.origins);

          // Verificamos si el país seleccionado actualmente (por defecto 'CL') sigue activo
          const currentIsActive = res.origins.find(o => o.code === originCountry);

          if (!currentIsActive) {
            // Si no está activo, intentamos seleccionar el primero de la lista
            if (res.origins.length > 0) {
              setOriginCountry(res.origins[0].code);
              setOriginCurrency(res.origins[0].currency);
            } else {
              // Si no hay ningún país activo, limpiamos la selección
              setOriginCountry('');
              setOriginCurrency('');
            }
          }
        }
      } catch (e) {
        console.error('Error cargando países de origen:', e);
        // Solo usamos fallback si hay un error de red real, no si la lista viene vacía
        // setOriginCountries([{ code: 'CL', name: 'Chile', currency: 'CLP' }]); 
      } finally {
        setLoadingOrigins(false);
      }
    };
    fetchOrigins();
  }, []); // Se ejecuta al montar

  // 2. Load Transaction Rules when Origin Changes
  useEffect(() => {
    const loadRules = async () => {
      try {
        const res = await getTransactionRules(originCountry);
        if (res.ok && res.rules.length > 0) {
          const rule = res.rules[0];
          setMinAmount(rule.minAmount);
          setAlertMessage(rule.alertMessage);
        } else {
          setMinAmount(5000);
          setAlertMessage('');
        }
      } catch (e) {
        console.warn('Could not load transaction rules.', e);
      }
    };
    if (originCountry) loadRules();
  }, [originCountry]);

  // 3. Handle Origin Change
  const handleOriginChange = (e) => {
    const code = e.target.value;
    setOriginCountry(code);
    const selected = originCountries.find(c => c.code === code);
    if (selected) setOriginCurrency(selected.currency);
    setQuote(null);
    setError('');
  };

  // 4. Main Effect: Validation & Quote Fetching
  useEffect(() => {
    setError('');
    setLimitError(false);
    setQuote(null);

    // Determine which amount to validate based on mode
    const activeAmount = mode === 'send' ? amount : destAmount;

    // Early return if no amount or no destination
    if (activeAmount <= 0 || !destCountry) return;

    // For 'receive' mode, skip min amount and KYC validations
    // These will be validated after we get the backend response
    if (mode === 'send') {
      // Min Amount Validation (only for send mode)
      if (amount < minAmount) {
        setError(`El monto mínimo es $${formatNumberForDisplay(minAmount)} ${originCurrency}.`);
        setLimitError(true);
        return;
      }

      // KYC Limit Validation (only for send mode)
      if (user) {
        const userLevel = user.kyc?.level || 1;
        // TODO: Fetch limits from backend based on currency
        const kycLimitsCLP = { 1: 450000, 2: 4500000, 3: 50000000 };
        let currentLimit = kycLimitsCLP[userLevel] || 450000;

        // Simple approximation for non-CLP currencies (for UX only, backend validates strictly)
        if (originCurrency !== 'CLP') {
          if (originCurrency === 'USD') currentLimit = currentLimit / 900;
          // Add logic for other currencies as needed
        }

        if (amount > currentLimit) {
          setError(`El monto excede tu límite de Nivel ${userLevel} ($${formatNumberForDisplay(currentLimit)} ${originCurrency}).`);
          setLimitError(true);
          return;
        }
      }
    }

    const debounceHandler = setTimeout(async () => {
      setLoading(true);
      try {
        const amountToSend = mode === 'send' ? amount : destAmount;

        const response = await getQuote({
          amount: amountToSend,
          destCountry,
          origin: originCurrency,
          originCountry,
          mode
        });

        if (response.ok) {
          if (response.data.validations?.length > 0) {
            setError(response.data.validations.join(', '));
            setQuote(null);
          } else {
            setQuote(response.data);
            // Actualizar el valor contrario para reflejar el cálculo
            if (mode === 'send') {
              // Si enviamos X, actualizamos cuánto reciben
              setDestAmount(response.data.receiveAmount);
              setDisplayDestAmount(formatNumberForDisplay(response.data.receiveAmount));
            } else {
              // Si queremos que reciban Y, actualizamos cuánto hay que enviar
              setAmount(response.data.amount);
              setDisplayAmount(formatNumberForDisplay(response.data.amount));
            }
          }
        } else {
          throw new Error(response.error || 'Error al obtener cotización.');
        }
      } catch (err) {
        setError(err.error || err.message || 'No se pudo obtener la cotización.');
        setQuote(null);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(debounceHandler);
  }, [amount, destAmount, mode, destCountry, originCountry, originCurrency, user, minAmount]);

  const handleAmountChange = (e) => {
    const rawValue = e.target.value;
    const parsedValue = parseFormattedNumber(rawValue);
    setAmount(parsedValue);
    setDisplayAmount(rawValue === '' ? '' : formatNumberForDisplay(parsedValue));
    setMode('send');
  };

  const handleDestAmountChange = (e) => {
    const rawValue = e.target.value;
    const parsedValue = parseFormattedNumber(rawValue);
    setDestAmount(parsedValue);
    setDisplayDestAmount(rawValue === '' ? '' : formatNumberForDisplay(parsedValue));
    setMode('receive');
  };

  const handleNextStep = () => {
    if (limitError) return;
    if (!quote || error) {
      toast.error("Por favor, obtenga una cotización válida antes de continuar.");
      return;
    }
    onQuoteSuccess({
      quoteData: quote,
      destCountry,
      originCountry,
      quoteTimestamp: Date.now()
    });
  };

  return (
    <Card className="p-4 shadow-lg border-0" style={{ borderRadius: '15px' }}>
      <Card.Body>

        <h4 className="mb-3 text-center fw-bold">Cotizar envío</h4>

        {alertMessage && (
          <Alert variant="info" className="small py-2 mb-3 text-center">
            ℹ️ {alertMessage}
          </Alert>
        )}

        <Form>
          {/* Compact "Estás enviando" Section with clickable country selector */}
          <div className="mb-2 p-3 bg-light rounded-3">
            <small className="text-muted d-block mb-2">Tú envías</small>
            <div className="d-flex align-items-center justify-content-between">
              <div
                className="d-flex align-items-center gap-2 cursor-pointer"
                style={{ minWidth: '110px', cursor: 'pointer' }}
                onClick={() => setShowOriginModal(true)}
              >
                {getFlagUrl(originCountry) && (
                  <img
                    src={getFlagUrl(originCountry)}
                    alt={originCountry}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <div className="d-flex flex-column lh-1">
                  <span className="fw-bold fs-5">{originCurrency}</span>
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>{CURRENCY_NAMES[originCurrency] || originCurrency}</small>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <Form.Control
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={displayAmount}
                onChange={handleAmountChange}
                className={`border-0 bg-transparent text-end fw-bold p-0 w-100 ${error ? 'text-danger' : ''}`}
                style={{ fontSize: '24px', flex: 1, minWidth: 0 }}
              />
            </div>
          </div>

          {/* Exchange Rate - Centered */}
          {quote && !loading && !error && (
            <div className="text-center my-2">
              <div className="d-flex align-items-center justify-content-center px-3 py-2 rounded-pill mx-auto text-truncate"
                style={{ backgroundColor: '#F7C843', maxWidth: '100%', width: 'fit-content' }}>
                <span className="me-2 fw-bold text-dark text-nowrap">Tasa:</span>
                <span className="fw-bold text-dark text-nowrap">
                  {formatRate(1 / quote.rateWithMarkup)} {quote.origin} = 1 {quote.destCurrency}
                </span>
                <i className="bi bi-arrow-down-up ms-2 text-dark"></i>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center my-2 text-muted small">
              <Spinner animation="border" size="sm" className="me-2" />
              Calculando mejor tasa...
            </div>
          )}

          {/* Compact "Ellos reciben" Section with clickable country selector */}
          <div className="mb-4 p-3 bg-light rounded-3">
            <small className="text-muted d-block mb-2">Ellos reciben</small>
            <div className="d-flex align-items-center justify-content-between">
              <div
                className="d-flex align-items-center gap-2"
                style={{ minWidth: '130px', cursor: 'pointer' }}
                onClick={() => setShowDestModal(true)}
              >
                {getFlagUrl(destCountry) && (
                  <img
                    src={getFlagUrl(destCountry)}
                    alt={destCountry}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <div className="d-flex flex-column lh-1">
                  <span className="fw-bold fs-5">{getCurrencyInfo(destCountry).code}</span>
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>{getCurrencyInfo(destCountry).name}</small>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <Form.Control
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={displayDestAmount}
                onChange={handleDestAmountChange}
                className={`border-0 bg-transparent text-end fw-bold p-0 w-100 ${error ? 'text-danger' : ''}`}
                style={{ fontSize: '24px', flex: 1, minWidth: 0 }}
              />
            </div>
          </div>

          {/* Bank Requirements Info - Always Show with Fallback */}
          {destCountry && (
            <Accordion className="mb-4 shadow-sm" flush defaultActiveKey="0">
              <Accordion.Item eventKey="0" style={{ border: 'none', borderRadius: '10px', overflow: 'hidden' }}>
                <Accordion.Header>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-info-circle-fill text-primary me-2"></i>
                    <small className="fw-bold text-muted">
                      {BANK_EXAMPLES[destCountry]
                        ? `¿Requisitos para ${BANK_EXAMPLES[destCountry].countryName}?`
                        : `Requisitos para el envío a ${destCountry}`}
                    </small>
                  </div>
                </Accordion.Header>
                <Accordion.Body className="bg-light small text-muted">
                  <ul className="list-unstyled mb-0 ps-2">
                    {(BANK_EXAMPLES[destCountry]?.requirements || [
                      'Número de Cuenta / IBAN',
                      'Nombre Completo del Beneficiario',
                      'Nombre del Banco',
                      'Documento de Identidad (Opcional)'
                    ]).map((req, idx) => (
                      <li key={idx} className="mb-2 d-flex align-items-start">
                        <i className="bi bi-check-circle-fill text-success me-2 mt-1" style={{ fontSize: '0.8em' }}></i>
                        {req}
                      </li>
                    ))}
                  </ul>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}

          {/* Quote Details */}
          {quote && !loading && !error && (
            <div className="mb-3">
              {/* Tasa específica para Bolivia */}
              {quote.isManual && (
                <div className="d-flex justify-content-center mb-2">
                  <span className="badge bg-success">
                    Tasa Garantizada
                  </span>
                </div>
              )}

              {quote.destCurrency === 'BOB' && (
                <div className="d-flex justify-content-center mb-2">
                  <span className="text-secondary small fst-italic">
                    Tasa de cambio Preferencial: {quote.rateWithMarkup}
                  </span>
                </div>
              )}

              <div className="d-flex justify-content-between fw-bold" style={{ fontSize: '1.1rem' }}>
                <span>Total a pagar:</span>
                <span>{formatNumberForDisplay(quote.amountIn)} {quote.origin} *</span>
              </div>
            </div>
          )}

          {error && <Alert variant="danger" className="text-center small py-2 mt-3">{error}</Alert>}

          {/* Upgrade Link if Limit Error */}
          {limitError && user && error.includes('límite') && (
            <div className="text-center mt-2">
              <Link to="/profile" className="text-decoration-none fw-bold text-accent">
                Aumentar mis límites &rarr;
              </Link>
            </div>
          )}

          <div className="d-grid mt-4">
            <Button
              onClick={handleNextStep}
              disabled={!quote || loading || !!error}
              variant="primary"
              className="py-3 fw-bold fs-6 text-white"
            >
              {loading ? 'Cotizando...' : 'Continuar'}
            </Button>
          </div>
        </Form>

        {/* Origin Country Selection Modal */}
        <Modal show={showOriginModal} onHide={() => setShowOriginModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Selecciona país de origen</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <ListGroup variant="flush">
              {loadingOrigins ? (
                <ListGroup.Item>Cargando...</ListGroup.Item>
              ) : originCountries.length === 0 ? (
                <ListGroup.Item>No hay países disponibles</ListGroup.Item>
              ) : (
                originCountries.map(c => (
                  <ListGroup.Item
                    key={c.code}
                    action
                    active={c.code === originCountry}
                    onClick={() => {
                      handleOriginChange({ target: { value: c.code } });
                      setShowOriginModal(false);
                    }}
                    className="d-flex align-items-center gap-3"
                    style={{ cursor: 'pointer' }}
                  >
                    {getFlagUrl(c.code) && (
                      <img
                        src={getFlagUrl(c.code)}
                        alt={c.code}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    )}
                    <div>
                      <div className="fw-bold">{c.name}</div>
                      <small className="text-muted">{c.currency} · {CURRENCY_NAMES[c.currency] || c.currency}</small>
                    </div>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </Modal.Body>
        </Modal>

        {/* Destination Country Selection Modal */}
        <Modal show={showDestModal} onHide={() => setShowDestModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Selecciona país destino</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <ListGroup variant="flush">
              {loadingCountries ? (
                <ListGroup.Item>Cargando...</ListGroup.Item>
              ) : (
                countries.map(c => (
                  <ListGroup.Item
                    key={c.code}
                    action
                    active={c.code === destCountry}
                    onClick={() => {
                      setDestCountry(c.code);
                      setShowDestModal(false);
                    }}
                    className="d-flex align-items-center gap-3"
                    style={{ cursor: 'pointer' }}
                  >
                    {getFlagUrl(c.code) && (
                      <img
                        src={getFlagUrl(c.code)}
                        alt={c.code}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    )}
                    <div>
                      <div className="fw-bold">{BANK_EXAMPLES[c.code]?.countryName || c.name}</div>
                      <small className="text-muted">
                        {getCurrencyInfo(c.code).code} · {getCurrencyInfo(c.code).name}
                      </small>
                    </div>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </Modal.Body>
        </Modal>
      </Card.Body>
    </Card >
  );
};

export default CardForm;