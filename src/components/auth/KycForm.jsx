import React, { useState } from 'react';
import { Form, Row, Col, Button, Alert, Spinner, Image, ProgressBar } from 'react-bootstrap';
import { updateUserProfile, uploadKycDocuments } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * KycForm — Flujo completo de KYC en 2 pasos dentro del mismo componente:
 *   Paso 1: Datos personales (nombre, documento, teléfono, dirección, fecha nacimiento)
 *   Paso 2: Documentos de identidad (frente CI, reverso CI, selfie)
 * onSuccess se llama SOLO cuando ambos pasos están completos.
 */
const KycForm = ({ onSuccess }) => {
  const { user, updateUserSession } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── PASO 1: Datos personales ──────────────────────────────────────────────
  const [formData, setFormData] = useState({
    firstName:      user?.firstName     || '',
    lastName:       user?.lastName      || '',
    documentType:   user?.documentType  || 'DNI',
    documentNumber: user?.documentNumber || '',
    phoneNumber:    user?.phoneNumber   || '',
    address:        user?.address       || '',
    birthDate:      user?.birthDate
      ? new Date(user.birthDate).toISOString().split('T')[0]
      : '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'documentNumber') {
      setFormData(prev => ({ ...prev, documentNumber: formatDocumentNumber(value, prev.documentType) }));
    } else if (name === 'documentType') {
      // Al cambiar tipo, limpiar número para evitar formatos erróneos
      setFormData(prev => ({ ...prev, documentType: value, documentNumber: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  /**
   * Formatea el número de documento según el tipo seleccionado:
   *   RUT        → 12.345.678-9
   *   DNI        → solo dígitos (Bolivia: 7-8 dígitos)
   *   CE         → solo dígitos (hasta 9)
   *   PASSPORT   → alfanumérico mayúsculas
   */
  const formatDocumentNumber = (raw, docType) => {
    if (docType === 'RUT') {
      // Limpiar todo excepto dígitos y 'k'/'K'
      const cleaned = raw.replace(/[^0-9kK]/g, '').toLowerCase();
      if (cleaned.length === 0) return '';
      const body = cleaned.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const dv   = cleaned.slice(-1).toUpperCase();
      return `${body}-${dv}`;
    }
    if (docType === 'DNI') {
      return raw.replace(/\D/g, '').slice(0, 8);
    }
    if (docType === 'CE') {
      return raw.replace(/\D/g, '').slice(0, 12);
    }
    if (docType === 'PASSPORT') {
      return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
    }
    return raw;
  };

  const docPlaceholder = {
    RUT:      '12.345.678-9',
    DNI:      'Ej: 1234567',
    CE:       'Número de cédula extranjería',
    PASSPORT: 'Ej: AB1234567',
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await updateUserProfile(formData);
      if (response.ok) {
        updateUserSession(response.user);
        setStep(2); // Avanzar al paso de documentos
      }
    } catch (err) {
      setError(err.error || 'Error al guardar tus datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── PASO 2: Documentos ────────────────────────────────────────────────────
  const [files, setFiles] = useState({ idFront: null, idBack: null, selfie: null });
  const [previews, setPreviews] = useState({ idFront: null, idBack: null, selfie: null });

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(`La imagen es demasiado grande (máx. 5MB).`);
      return;
    }
    setFiles(prev => ({ ...prev, [field]: file }));
    setPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    setError('');
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!files.idFront || !files.idBack || !files.selfie) {
      setError('Por favor sube las 3 imágenes requeridas.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('idFront', files.idFront);
      fd.append('idBack',  files.idBack);
      fd.append('selfie',  files.selfie);

      const response = await uploadKycDocuments(fd);
      if (response.ok) {
        const updatedUser = { ...user, kyc: response.kyc };
        updateUserSession(updatedUser);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError(err.error || 'Error al subir los documentos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Progreso */}
      <div className="mb-4">
        <div className="d-flex justify-content-between small text-muted mb-1">
          <span className={step === 1 ? 'fw-bold text-primary' : ''}>1. Datos personales</span>
          <span className={step === 2 ? 'fw-bold text-primary' : ''}>2. Documentos de identidad</span>
        </div>
        <ProgressBar now={step === 1 ? 50 : 100} variant="warning" style={{ height: '4px' }} />
      </div>

      {error && <Alert variant="danger" className="py-2">{error}</Alert>}

      {/* ── PASO 1 ── */}
      {step === 1 && (
        <Form onSubmit={handleStep1Submit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nombres</Form.Label>
                <Form.Control type="text" name="firstName" value={formData.firstName}
                  onChange={handleChange} required placeholder="Ej: Juan Andrés" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Apellidos</Form.Label>
                <Form.Control type="text" name="lastName" value={formData.lastName}
                  onChange={handleChange} required placeholder="Ej: Pérez López" />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Tipo Doc.</Form.Label>
                <Form.Select name="documentType" value={formData.documentType} onChange={handleChange}>
                  <option value="DNI">DNI</option>
                  <option value="RUT">RUT</option>
                  <option value="CE">Cédula Extranjería</option>
                  <option value="PASSPORT">Pasaporte</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Número de Documento</Form.Label>
                <Form.Control type="text" name="documentNumber" value={formData.documentNumber}
                  onChange={handleChange} required
                  placeholder={docPlaceholder[formData.documentType] || 'Número de documento'} />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Teléfono Móvil</Form.Label>
            <Form.Control type="tel" name="phoneNumber" value={formData.phoneNumber}
              onChange={handleChange} required placeholder="+591 7xxxxxxx" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Dirección Residencial</Form.Label>
            <Form.Control type="text" name="address" value={formData.address}
              onChange={handleChange} required placeholder="Calle, Número, Ciudad" />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Fecha de Nacimiento</Form.Label>
            <Form.Control type="date" name="birthDate" value={formData.birthDate}
              onChange={handleChange} required max={new Date().toISOString().split('T')[0]} />
          </Form.Group>
          <div className="d-grid">
            <Button type="submit" disabled={loading}
              style={{ backgroundColor: 'var(--avf-secondary)', borderColor: 'var(--avf-secondary)' }}
              className="py-2 fw-bold">
              {loading ? <Spinner size="sm" /> : 'Guardar y Continuar →'}
            </Button>
          </div>
        </Form>
      )}

      {/* ── PASO 2 ── */}
      {step === 2 && (
        <Form onSubmit={handleStep2Submit}>
          <p className="text-muted small mb-4">
            Para verificar tu identidad, necesitamos una foto de tu documento por ambos lados y una selfie sosteniéndolo.
          </p>
          <Row className="mb-3">
            <Col xs={6}>
              <Form.Group>
                <Form.Label className="fw-bold small">📄 CI / Pasaporte — Frente</Form.Label>
                <Form.Control type="file" accept="image/*" size="sm"
                  onChange={(e) => handleFileChange(e, 'idFront')} required />
                {previews.idFront && <Image src={previews.idFront} thumbnail className="mt-2" style={{ maxHeight: '120px' }} />}
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group>
                <Form.Label className="fw-bold small">📄 CI / Pasaporte — Reverso</Form.Label>
                <Form.Control type="file" accept="image/*" size="sm"
                  onChange={(e) => handleFileChange(e, 'idBack')} required />
                {previews.idBack && <Image src={previews.idBack} thumbnail className="mt-2" style={{ maxHeight: '120px' }} />}
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold small">🤳 Selfie sosteniendo tu documento</Form.Label>
            <Form.Control type="file" accept="image/*" size="sm"
              onChange={(e) => handleFileChange(e, 'selfie')} required />
            <Form.Text className="text-muted">Rostro bien iluminado, documento visible y legible.</Form.Text>
            {previews.selfie && <div className="mt-2"><Image src={previews.selfie} thumbnail style={{ maxHeight: '160px' }} /></div>}
          </Form.Group>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" onClick={() => { setStep(1); setError(''); }}
              disabled={loading}>← Atrás</Button>
            <Button type="submit" disabled={loading} className="flex-grow-1 fw-bold text-white"
              style={{ backgroundColor: 'var(--avf-secondary)', borderColor: 'var(--avf-secondary)' }}>
              {loading ? <><Spinner size="sm" className="me-2" />Subiendo...</> : 'Enviar para Revisión ✓'}
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
};

export default KycForm;