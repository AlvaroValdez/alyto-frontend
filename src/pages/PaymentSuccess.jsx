import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Spinner, Badge, Alert } from 'react-bootstrap';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { getTransactions, checkPaymentStatus } from '../services/api';
import { formatNumberForDisplay, formatRate } from '../utils/formatting';
import { getBankName, getAccountTypeName } from '../utils/bankMappings'; // ✅ Static fallback mappings
import html2canvas from 'html2canvas';
import logo from '../assets/images/logo.png';

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

const getFlagUrl = (code) => FLAGS[code?.toUpperCase()] || '';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orderId: paramOrderId } = useParams();

  let rawOrderId = paramOrderId || searchParams.get('orderId');
  if (rawOrderId && rawOrderId.includes('?')) {
    rawOrderId = rawOrderId.split('?')[0];
  }
  const orderId = rawOrderId;

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    if (!orderId) return;

    console.log(`🔍 Verificando estado del pago para orden: ${orderId}`);

    // 🔄 Retry mechanism con delays más largos para dar tiempo a Vita
    const MAX_RETRIES = 8;  // ⬆️ Aumentado de 3 a 8
    const RETRY_DELAY = 5000; // ⬆️ Aumentado de 2s a 5s

    const fetchTx = async () => {
      try {
        setLoading(true);

        let attempt = 0;
        let lastError = null;

        while (attempt < MAX_RETRIES) {
          attempt++;
          console.log(`🔄 Intento ${attempt}/${MAX_RETRIES}...`);

          try {
            const result = await checkPaymentStatus(orderId);
            console.log('✅ Status check resultado:', result);

            // Si está completado, salir del loop
            if (result?.payinStatus === 'completed' || result?.status === 'completed') {
              console.log('🎉 Pago confirmado y procesado!');
              break;
            }

            // Si es el último intento y aún está pending, mostrar advertencia
            if (attempt === MAX_RETRIES) {
              console.warn('⚠️ Pago aún pendiente después de todos los intentos');
            }

          } catch (err) {
            lastError = err;
            console.error(`❌ Error en intento ${attempt}:`, err.message);
          }

          // Esperar antes del próximo intento (excepto en el último)
          if (attempt < MAX_RETRIES) {
            console.log(`⏳ Esperando ${RETRY_DELAY / 1000} segundos...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          }
        }

        if (lastError && attempt === MAX_RETRIES) {
          console.error('❌ No se pudo verificar el pago después de todos los intentos');
        }

        const res = await getTransactions({ order: orderId });
        if (res?.transactions?.length > 0) {
          setTransaction(res.transactions[0]);
        }
      } catch (e) {
        console.error('Error fetching transaction:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [orderId]);

  // ✅ DEBUG LOGGING
  useEffect(() => {
    if (transaction) {
      console.log('🧾 [Receipt] Transaction Full Object:', transaction);
      console.log('📦 [Receipt] Withdrawal Payload:', transaction.withdrawalPayload);
      console.log('🏦 [Receipt] Account Bank:', transaction.account_bank);
    }
  }, [transaction]);

  // Convierte código de mercado/país a ISO de moneda ("CL" → "CLP", "CO" → "COP", etc.)
  const COUNTRY_TO_CURRENCY = {
    CL: 'CLP', CO: 'COP', AR: 'ARS', MX: 'MXN', BR: 'BRL', PE: 'PEN',
    BO: 'BOB', VE: 'VES', EC: 'USD', PA: 'USD', GT: 'GTQ', SV: 'USD',
    DO: 'DOP', CR: 'CRC', PY: 'PYG', UY: 'UYU', US: 'USD', EU: 'EUR',
    GB: 'GBP', PL: 'PLN', AU: 'AUD', CN: 'CNY', HT: 'HTG'
  };
  const toCurrencyCode = (code) => COUNTRY_TO_CURRENCY[code?.toUpperCase()] || code || '';

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { variant: 'warning', text: 'Pendiente', icon: '⏳' },
      processing: { variant: 'info', text: 'Procesando', icon: '🔄' },
      completed: { variant: 'success', text: 'Completado', icon: '✓' },
      succeeded: { variant: 'success', text: 'Exitoso', icon: '✓' },
      rejected: { variant: 'danger', text: 'Rechazado', icon: '✗' }
    };
    const config = statusMap[status] || { variant: 'secondary', text: status, icon: '•' };
    return (
      <Badge bg={config.variant} className="px-3 py-2">
        <span className="me-1">{config.icon}</span>
        {config.text}
      </Badge>
    );
  };

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return 'N/A';
    const str = String(accountNumber);
    return `•••• ${str.slice(-4)}`;
  };

  const getEstimatedArrival = () => {
    // Estimate 1-3 business days
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
  };

  // ✅ FIX: PRIORIDAD ALYTO RATE - Mostrar tasa de Alyto (con spread aplicado)
  const getEffectiveRate = () => {
    if (!transaction) return null;

    // 🎯 Prioridad 1: TASA ALYTO (la que el usuario vio en quote)
    if (transaction.rateTracking?.alytoRate) {
      return transaction.rateTracking.alytoRate;
    }

    // Prioridad 2: Calcular desde montos si no hay alytoRate guardada
    const destAmount = transaction.rateTracking?.destAmount || transaction.amountsTracking?.destReceiveAmount;
    const originAmount = transaction.amount;

    if (destAmount && originAmount && originAmount > 0) {
      return destAmount / originAmount;
    }

    // Prioridad 3: Usar tasa Vita como último recurso (NO DESEADO)
    if (transaction.rateTracking?.vitaRate) {
      console.warn('⚠️ Mostrando tasa Vita en comprobante - Debería ser Alyto');
      return transaction.rateTracking.vitaRate;
    }

    return null;
  };

  // Construye el texto del mensaje WhatsApp con los datos de la transacción
  const buildWhatsAppText = () => {
    if (!transaction) return `Comprobante de transferencia Alyto\nID: ${orderId}`;

    const at = transaction.amountsTracking || {};
    const rt = transaction.rateTracking || {};

    const originTotal = at.originTotal ?? transaction.amount ?? 0;
    const originCurrency = at.originCurrency || transaction.currency || '';
    const destReceive = at.destReceiveAmount ?? rt.destAmount ?? 0;
    const destCurrency = toCurrencyCode(at.destCurrency || rt.destCurrency || transaction.country || '');
    const rate = rt.alytoRate
      ? `1 ${originCurrency} = ${rt.alytoRate} ${destCurrency}`
      : null;

    const benefName = [
      transaction.beneficiary_first_name || transaction.withdrawalPayload?.beneficiary_first_name,
      transaction.beneficiary_last_name || transaction.withdrawalPayload?.beneficiary_last_name
    ].filter(Boolean).join(' ');

    const lines = [
      '🏦 *Comprobante de Transferencia Alyto*',
      '',
      `💸 Enviado: ${originCurrency} ${Number(originTotal).toLocaleString('es-CL')}`,
      `✅ Beneficiario recibe: ${destCurrency} ${Number(destReceive).toLocaleString('es-CL')}`,
      ...(benefName ? [`👤 Beneficiario: ${benefName}`] : []),
      ...(rate ? [`📊 Tasa: ${rate}`] : []),
      `📋 ID: ${orderId}`,
      '',
      '_Transferencia procesada por Alyto_'
    ];

    return lines.join('\n');
  };

  // Compartir por WhatsApp con texto formateado
  const handleWhatsAppShare = () => {
    const text = buildWhatsAppText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Compartir imagen nativa (móvil) o descarga (desktop)
  const handleShareImage = async () => {
    const cardElement = document.getElementById('receipt-capture-area');
    if (!cardElement) return;

    try {
      // Scroll to top so the element is in a predictable position
      const savedScroll = window.scrollY;
      window.scrollTo(0, 0);
      await new Promise(r => requestAnimationFrame(r));

      const canvas = await html2canvas(cardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        // Use full document height so tall receipts are never clipped
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.scrollHeight,
        logging: false,
      });

      window.scrollTo(0, savedScroll);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `comprobante-alyto-${orderId}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Comprobante Alyto' });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      // Fallback: descargar
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-alyto-${orderId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando imagen:', err);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/payment-success/${orderId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Enlace copiado');
    } catch (err) {
      console.error('Error copiando enlace:', err);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '80vh' }}>
      <Card className="border-0 shadow-lg" style={{ maxWidth: '700px', width: '100%', borderRadius: '20px' }}>
        <Card.Body className="p-4 p-md-5">
          {/* Logo Header */}
          <div className="text-center mb-4">
            <img src={logo} alt="Alyto" style={{ height: '110px' }} className="mb-3" />
          </div>

          {/* Success Icon */}
          <div className="text-center mb-4">
            <div
              className="mx-auto"
              style={{
                width: '60px', height: '60px', borderRadius: '50%',
                backgroundColor: '#28a745', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
              }}
            >
              ✓
            </div>
          </div>

          <h3 className="text-center fw-bold mb-2" style={{ color: '#233E58' }}>
            ¡Pago Recibido!
          </h3>
          <p className="text-center text-muted mb-4">
            Hemos recibido tu solicitud. Tu envío está en proceso.
          </p>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : transaction ? (
            <>
              {/* ⚠️ Warning for Pending Transactions */}
              {(transaction?.status === 'pending' || transaction?.payinStatus === 'pending') && (
                <Alert variant="warning" className="mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <strong>Tu pago está siendo verificado</strong>
                  </div>
                  <p className="small mb-3">
                    Estamos confirmando tu transacción con el banco.
                    Si completaste el pago en Fintoc, haz clic en el botón para verificar el estado.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await checkPaymentStatus(orderId);
                        window.location.reload();
                      } catch (err) {
                        console.error('Error verificando estado:', err);
                      }
                    }}
                  >
                    🔄 Verificar Estado del Pago
                  </Button>
                </Alert>
              )}

              {/* Capturable area: logo + receipt card */}
              <div id="receipt-capture-area" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px' }}>
                <div className="text-center mb-3">
                  <img src={logo} alt="Alyto" style={{ height: '70px' }} />
                </div>

                {/* Transaction Details Card */}
                <div id="receipt-card-body" className="bg-light p-4 rounded-3 mb-0">
                {/* Transaction ID */}
                <div className="mb-3 pb-3 border-bottom">
                  <small className="text-muted d-block mb-1">ID de Transacción</small>
                  <span className="fw-bold" style={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>
                    {orderId}
                  </span>
                </div>

                {/* Origin Amount with Flag */}
                <div className="mb-3 pb-3 border-bottom">
                  <small className="text-muted d-block mb-2">Tú enviaste</small>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      {getFlagUrl(transaction.currency?.substring(0, 2)) && (
                        <img
                          src={getFlagUrl(transaction.currency?.substring(0, 2))}
                          alt={transaction.currency}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      )}
                      <span className="fw-bold fs-5 text-dark" translate="no">{transaction.currency}</span>
                    </div>
                    <span className="fw-bold" style={{ fontSize: '1.5rem', color: '#233E58' }}>
                      ${formatNumberForDisplay(transaction.amount)}
                    </span>
                  </div>
                </div>

                {/* Destination Amount with Flag - PROMINENT */}
                {((transaction.rateTracking?.destAmount && transaction.rateTracking?.destCurrency) ||
                  (transaction.amountsTracking?.destReceiveAmount && transaction.amountsTracking?.destCurrency)) && (
                    <div className="mb-3 pb-3 border-bottom">
                      <small className="text-muted d-block mb-2">Ellos reciben</small>
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          {getFlagUrl(transaction.destCountry || transaction.country) && (
                            <img
                              src={getFlagUrl(transaction.destCountry || transaction.country)}
                              alt={transaction.destCountry}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          )}
                          <span className="fw-bold fs-5 text-dark" translate="no">
                            {toCurrencyCode(transaction.rateTracking?.destCurrency || transaction.amountsTracking?.destCurrency || transaction.country)}
                          </span>
                        </div>
                        <span className="fw-bold" style={{ fontSize: '2rem', color: '#28a745' }}>
                          {formatNumberForDisplay(
                            transaction.rateTracking?.destAmount || transaction.amountsTracking?.destReceiveAmount || 0
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                {/* Exchange Rate - With Fallback Logic */}
                {(() => {
                  const effectiveRate = getEffectiveRate();
                  const destCurrency = toCurrencyCode(transaction.rateTracking?.destCurrency || transaction.amountsTracking?.destCurrency || transaction.country);

                  return effectiveRate && destCurrency ? (
                    <div className="mb-3 pb-3 border-bottom">
                      <small className="text-muted d-block mb-2">Tasa de cambio</small>
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-light text-dark border px-3 py-2" translate="no">
                          <i className="bi bi-arrow-left-right me-2"></i>
                          <span className="fw-bold">
                            1 {transaction.currency} = {formatRate(effectiveRate)} {destCurrency}
                          </span>
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Fee Information */}
                {transaction.fee > 0 && (
                  <div className="mb-3 pb-3 border-bottom">
                    <small className="text-muted d-block mb-2">Comisión</small>
                    <span className="fw-bold">
                      $ {formatNumberForDisplay(transaction.fee)} {transaction.currency}
                      {transaction.feePercent && ` (${transaction.feePercent}%)`}
                    </span>
                  </div>
                )}

                {/* Beneficiary & Bank Details - Combined and Prominent */}
                <div className="mb-3 pb-3 border-bottom">
                  <small className="text-muted d-block mb-3">Beneficiario</small>

                  {/* Name */}
                  <div className="fw-bold fs-5 mb-3" style={{ color: '#233E58' }}>
                    {transaction.beneficiary_first_name} {transaction.beneficiary_last_name}
                    {transaction.company_name && (
                      <small className="text-muted d-block mt-1">{transaction.company_name}</small>
                    )}
                  </div>

                  {/* ✅ FIX: Robust bank details check (fallback to payload) */}
                  {(() => {
                    const accountBank = transaction.account_bank ||
                      transaction.withdrawalPayload?.account_bank ||
                      transaction.withdrawalPayload?.account_number;

                    // ✅ Usar nombre legible con fallback a mapeo estático
                    const bankDisplayName = transaction.bank_name ||
                      transaction.withdrawalPayload?.bank_name ||
                      getBankName(transaction.bank_code, transaction.country); // Fallback estático

                    // ✅ Usar nombre legible de tipo de cuenta con fallback
                    const accountTypeName = transaction.account_type_name ||
                      getAccountTypeName(transaction.account_type); // Fallback estático

                    return (
                      <>
                        {accountBank && (
                          <div className="mb-3">
                            <small className="text-muted d-block mb-1">Nro de cuenta</small>
                            <span className="badge bg-light text-dark border px-3 py-2 font-monospace" style={{ fontSize: '0.95rem' }}>
                              {maskAccountNumber(accountBank)}
                            </span>
                          </div>
                        )}

                        {bankDisplayName && (
                          <div className="d-flex align-items-center gap-2 p-3 rounded-2 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                            <i className="bi bi-bank2 text-primary" style={{ fontSize: '1.5rem' }}></i>
                            <div>
                              <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Banco</small>
                              <span className="fw-bold" style={{ fontSize: '1rem' }}>{bankDisplayName}</span>
                            </div>
                          </div>
                        )}

                        {accountTypeName && (
                          <div className="mb-3">
                            <small className="text-muted d-block mb-1">Tipo de cuenta</small>
                            <span className="fw-bold">{accountTypeName}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}


                  {/* Additional Details Grid */}
                  <div className="row g-3">
                    {/* Document/CI - With Fallback to Snapshot */}
                    {(() => {
                      const docId = transaction.beneficiary_cc || transaction.beneficiarySnapshot?.beneficiary_cc;
                      const docType = transaction.beneficiarySnapshot?.cc_type || 'CI'; // CI, RUT, DNI, etc.

                      return docId ? (
                        <div className="col-md-6">
                          <small className="text-muted d-block mb-1">{docType}</small>
                          <span className="font-monospace fw-bold">{docId}</span>
                        </div>
                      ) : null;
                    })()}

                    {/* Account Type - REMOVED: Now shown in bank details block above */}

                    {/* Concept */}
                    {transaction.concept && (
                      <div className="col-12">
                        <small className="text-muted d-block mb-1">Concepto</small>
                        <span>{transaction.concept}</span>
                      </div>
                    )}

                    {/* Created Date */}
                    {transaction.createdAt && (
                      <div className="col-md-6">
                        <small className="text-muted d-block mb-1">Fecha de envío</small>
                        <span>{new Date(transaction.createdAt).toLocaleString('es-ES', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                        })}</span>
                      </div>
                    )}

                    {/* Estimated Time */}
                    <div className="col-md-6">
                      <small className="text-muted d-block mb-1">Tiempo estimado</small>
                      <span>En unas horas hábiles</span>
                    </div>

                    {/* Vita Transfer ID - With Fallback */}
                    {(() => {
                      const transferId = transaction.vitaTransferId ||
                        transaction.withdrawalResponse?.transfer_id ||
                        transaction.beneficiarySnapshot?.transferId;

                      return transferId ? (
                        <div className="col-12">
                          <small className="text-muted d-block mb-1">Transfer ID de Vita</small>
                          <div className="d-flex align-items-center gap-2">
                            <span className="font-monospace small text-break" style={{ fontSize: '0.85rem' }}>
                              {transferId}
                            </span>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                navigator.clipboard.writeText(transferId);
                                // Optional: Show feedback
                                const btn = event.target.closest('button');
                                const originalHTML = btn.innerHTML;
                                btn.innerHTML = '<i class="bi bi-check"></i>';
                                setTimeout(() => btn.innerHTML = originalHTML, 1000);
                              }}
                              title="Copiar Transfer ID"
                            >
                              <i className="bi bi-clipboard"></i>
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>


                {/* Status Only - Removed Timeline */}
                <div className="d-flex justify-content-center">
                  <div className="text-center">
                    <small className="text-muted d-block mb-2">Estado</small>
                    {getStatusBadge(transaction.status)}
                  </div>
                </div>
                </div>
              </div>{/* /receipt-capture-area */}

              {/* Botones de compartir */}
              <div className="d-flex gap-2 mb-3 flex-wrap">
                <Button
                  variant="success"
                  className="flex-fill fw-bold"
                  onClick={handleWhatsAppShare}
                  style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                >
                  <i className="bi bi-whatsapp me-2"></i>
                  WhatsApp
                </Button>
                <Button
                  variant="outline-primary"
                  className="flex-fill"
                  onClick={handleShareImage}
                >
                  <i className="bi bi-image me-2"></i>
                  Guardar imagen
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={handleCopyLink}
                  title="Copiar enlace"
                >
                  <i className="bi bi-clipboard"></i>
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2 mt-3">
                <Button
                  variant="primary"
                  className="fw-bold text-white py-3"
                  onClick={() => navigate('/send')}
                >
                  <i className="bi bi-arrow-repeat me-2"></i>
                  Nueva Transacción
                </Button>
                <Button
                  variant="outline-primary"
                  className="fw-bold py-3"
                  as={Link}
                  to="/transactions"
                >
                  <i className="bi bi-list-ul me-2"></i>
                  Ver Mis Transacciones
                </Button>
              </div>
            </>
          ) : (
            orderId && (
              <div className="bg-light p-4 rounded-3 text-center">
                <small className="text-muted d-block mb-2">ID de Orden</small>
                <strong className="d-block" style={{ color: '#233E58', fontSize: '1.1rem', wordBreak: 'break-all' }}>
                  {orderId}
                </strong>
              </div>
            )
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PaymentSuccess;