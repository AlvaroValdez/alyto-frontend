import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Modal, Form, Row, Col, Image, Spinner, Alert } from 'react-bootstrap';

import { getPendingKycUsers, reviewKycUser, apiClient } from '../services/api';

const AdminKyc = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => { fetchPendingUsers(); }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await getPendingKycUsers();
      if (response.ok) setUsers(response.users);
    } catch (err) {
      setError('Error al cargar solicitudes pendientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = async (userPreview) => {
    setProcessing(true);
    try {
      const response = await apiClient.get(`/admin/kyc/${userPreview._id}`);
      if (response.data.ok) {
        setSelectedUser(response.data.user);
        setShowRejectInput(false);
        setRejectReason('');
        setShowModal(true);
      }
    } catch (err) {
      alert('Error al cargar los detalles del usuario.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecision = async (action) => {
    if (action === 'reject' && !showRejectInput) { setShowRejectInput(true); return; }
    if (action === 'reject' && !rejectReason) { alert('Por favor, ingresa un motivo para el rechazo.'); return; }
    setProcessing(true);
    try {
      const response = await reviewKycUser(selectedUser._id, action, rejectReason);
      if (response.ok) {
        setShowModal(false);
        fetchPendingUsers();
        alert(action === 'approve' ? '✅ Usuario aprobado correctamente.' : '❌ Usuario rechazado.');
      }
    } catch (err) {
      alert(err.error || 'Error al procesar la solicitud.');
    } finally {
      setProcessing(false);
    }
  };

  const Field = ({ label, value }) => (
    <div className="d-flex py-2 border-bottom" style={{ gap: '8px' }}>
      <span className="text-muted fw-bold" style={{ minWidth: '140px', fontSize: '0.8rem' }}>{label}</span>
      <span className="text-dark" style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{value || <em className="text-muted">—</em>}</span>
    </div>
  );

  return (
    <Container className="my-5">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white py-3">
          <h4 className="mb-0" style={{ color: 'var(--avf-primary)' }}>Cola de Revisión KYC</h4>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {loading ? (
            <div className="text-center p-5"><Spinner animation="border" /></div>
          ) : users.length === 0 ? (
            <Alert variant="success">No hay solicitudes pendientes. ¡Todo al día!</Alert>
          ) : (
            <Table hover responsive className="align-middle">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td><small>{new Date(u.kyc.submittedAt).toLocaleDateString('es-CL')}</small></td>
                    <td className="fw-bold">{u.name}</td>
                    <td><small>{u.email}</small></td>
                    <td>
                      <Badge bg={u.accountType === 'business' ? 'info' : 'secondary'} text={u.accountType === 'business' ? 'dark' : 'white'}>
                        {u.accountType === 'business' ? 'EMPRESA' : 'PERSONAL'}
                      </Badge>
                    </td>
                    <td><Badge bg="warning" text="dark">PENDIENTE</Badge></td>
                    <td>
                      <Button size="sm" variant="outline-primary" onClick={() => handleInspect(u)} disabled={processing}>
                        {processing ? <Spinner size="sm" /> : 'Revisar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ── MODAL DE REVISIÓN ── */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" backdrop="static">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            Revisando KYC: <strong>{selectedUser?.name}</strong>
            <Badge bg={selectedUser?.accountType === 'business' ? 'info' : 'secondary'} text={selectedUser?.accountType === 'business' ? 'dark' : 'white'} className="ms-2">
              {selectedUser?.accountType === 'business' ? 'EMPRESA' : 'PERSONAL'}
            </Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Row>
              {/* ── COLUMNA IZQUIERDA: Datos del usuario ── */}
              <Col md={5} className="border-end pe-4">
                <h6 className="text-primary fw-bold mb-3">
                  <i className="bi bi-person-badge me-2"></i>Datos Declarados por el Usuario
                </h6>

                <div className="mb-3">
                  <h6 className="text-muted fw-bold small text-uppercase mb-2" style={{ letterSpacing: '1px' }}>Cuenta</h6>
                  <Field label="Nombre (usuario)" value={selectedUser.name} />
                  <Field label="Email" value={selectedUser.email} />
                  <Field label="País Registro" value={selectedUser.registrationCountry} />
                  <Field label="Niv. KYC actual" value={selectedUser.kyc?.level} />
                  <Field label="Fecha solicitud" value={selectedUser.kyc?.submittedAt ? new Date(selectedUser.kyc.submittedAt).toLocaleString('es-CL') : null} />
                </div>

                {selectedUser.accountType === 'business' ? (
                  <div className="mb-3">
                    <h6 className="text-muted fw-bold small text-uppercase mb-2" style={{ letterSpacing: '1px' }}>Empresa</h6>
                    <Field label="Razón Social" value={selectedUser.business?.name} />
                    <Field label="ID Fiscal (NIT)" value={selectedUser.business?.taxId} />
                    <Field label="Dirección Registrada" value={selectedUser.business?.registeredAddress} />
                  </div>
                ) : (
                  <div className="mb-3">
                    <h6 className="text-muted fw-bold small text-uppercase mb-2" style={{ letterSpacing: '1px' }}>Identidad Personal</h6>
                    <Field label="Nombres legales" value={selectedUser.firstName} />
                    <Field label="Apellidos legales" value={selectedUser.lastName} />
                    <Field label="Tipo Documento" value={selectedUser.documentType} />
                    <Field label="Nro. Documento" value={selectedUser.documentNumber} />
                    <Field label="Fecha Nacimiento" value={selectedUser.birthDate ? new Date(selectedUser.birthDate).toLocaleDateString('es-CL') : null} />
                    <Field label="Teléfono" value={selectedUser.phoneNumber} />
                    <Field label="Dirección" value={selectedUser.address} />
                  </div>
                )}

                {showRejectInput && (
                  <Form.Group className="mt-3 bg-danger bg-opacity-10 p-3 rounded border border-danger">
                    <Form.Label className="fw-bold text-danger">Motivo del Rechazo:</Form.Label>
                    <Form.Control
                      as="textarea" rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ej: La foto del documento está borrosa..."
                    />
                  </Form.Group>
                )}
              </Col>

              {/* ── COLUMNA DERECHA: Documentos ── */}
              <Col md={7} className="ps-4">
                <h6 className="text-primary fw-bold mb-3">
                  <i className="bi bi-file-earmark-image me-2"></i>Documentos Presentados
                  <small className="text-muted fw-normal ms-2">— Comparar con los datos de la izquierda</small>
                </h6>

                {selectedUser.accountType === 'business' ? (
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="border rounded p-3 text-center h-100">
                        <small className="d-block text-muted fw-bold mb-2">Acta de Constitución</small>
                        <i className="bi bi-file-earmark-pdf fs-1 text-danger d-block mb-2"></i>
                        <Button variant="primary" size="sm" href={selectedUser.business?.documents?.incorporation} target="_blank" disabled={!selectedUser.business?.documents?.incorporation}>
                          <i className="bi bi-box-arrow-up-right me-1"></i>Abrir PDF
                        </Button>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="border rounded p-3 text-center h-100">
                        <small className="d-block text-muted fw-bold mb-2">ID Fiscal (NIT/RUT)</small>
                        <i className="bi bi-file-earmark-pdf fs-1 text-danger d-block mb-2"></i>
                        <Button variant="primary" size="sm" href={selectedUser.business?.documents?.taxIdCard} target="_blank" disabled={!selectedUser.business?.documents?.taxIdCard}>
                          <i className="bi bi-box-arrow-up-right me-1"></i>Abrir PDF
                        </Button>
                      </div>
                    </Col>
                  </Row>
                ) : (
                  <Row className="g-3">
                    <Col md={4}>
                      <div className="border rounded p-2 text-center h-100">
                        <small className="d-block text-muted fw-bold mb-2">CI / Pasaporte — Frente</small>
                        {selectedUser.kyc.documents?.idFront
                          ? <Image src={selectedUser.kyc.documents.idFront} fluid rounded style={{ maxHeight: '200px' }} alt="Frente" />
                          : <div className="py-4 text-muted small"><i className="bi bi-image fs-2 d-block mb-1"></i>Sin imagen</div>
                        }
                        {selectedUser.kyc.documents?.idFront && (
                          <Button variant="link" size="sm" href={selectedUser.kyc.documents.idFront} target="_blank" className="mt-1">
                            <i className="bi bi-zoom-in me-1"></i>Ver original
                          </Button>
                        )}
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="border rounded p-2 text-center h-100">
                        <small className="d-block text-muted fw-bold mb-2">CI / Pasaporte — Reverso</small>
                        {selectedUser.kyc.documents?.idBack
                          ? <Image src={selectedUser.kyc.documents.idBack} fluid rounded style={{ maxHeight: '200px' }} alt="Reverso" />
                          : <div className="py-4 text-muted small"><i className="bi bi-image fs-2 d-block mb-1"></i>Sin imagen</div>
                        }
                        {selectedUser.kyc.documents?.idBack && (
                          <Button variant="link" size="sm" href={selectedUser.kyc.documents.idBack} target="_blank" className="mt-1">
                            <i className="bi bi-zoom-in me-1"></i>Ver original
                          </Button>
                        )}
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="border rounded p-2 text-center h-100">
                        <small className="d-block text-muted fw-bold mb-2">Selfie con Documento</small>
                        {selectedUser.kyc.documents?.selfie
                          ? <Image src={selectedUser.kyc.documents.selfie} fluid rounded style={{ maxHeight: '200px' }} alt="Selfie" />
                          : <div className="py-4 text-muted small"><i className="bi bi-image fs-2 d-block mb-1"></i>Sin imagen</div>
                        }
                        {selectedUser.kyc.documents?.selfie && (
                          <Button variant="link" size="sm" href={selectedUser.kyc.documents.selfie} target="_blank" className="mt-1">
                            <i className="bi bi-zoom-in me-1"></i>Ver original
                          </Button>
                        )}
                      </div>
                    </Col>
                  </Row>
                )}

                {/* Checklist de verificación */}
                <div className="mt-4 p-3 bg-light rounded border">
                  <small className="fw-bold text-muted d-block mb-2 text-uppercase" style={{ letterSpacing: '1px' }}>Checklist de Verificación</small>
                  <div className="d-flex flex-wrap gap-3">
                    {['Nombre coincide con doc.', 'Nro. documento legible', 'Foto nítida y sin filtros', 'Selfie sostiene el doc.', 'Datos de nacimiento correctos'].map(item => (
                      <span key={item} className="badge bg-white border text-muted fw-normal">
                        <i className="bi bi-square me-1"></i>{item}
                      </span>
                    ))}
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={processing}>Cancelar</Button>
          {!showRejectInput && (
            <>
              <Button variant="danger" onClick={() => handleDecision('reject')} disabled={processing}>
                <i className="bi bi-x-circle me-1"></i>Rechazar
              </Button>
              <Button variant="success" onClick={() => handleDecision('approve')} disabled={processing}>
                {processing ? <Spinner size="sm" /> : <><i className="bi bi-check-circle me-1"></i>Aprobar Verificación</>}
              </Button>
            </>
          )}
          {showRejectInput && (
            <Button variant="danger" onClick={() => handleDecision('reject')} disabled={processing}>
              {processing ? <Spinner size="sm" /> : 'Confirmar Rechazo'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminKyc;