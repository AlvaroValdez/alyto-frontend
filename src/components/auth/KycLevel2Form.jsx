import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, Image, Row, Col } from 'react-bootstrap';
import { uploadKycDocuments, updateUserProfile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DOCUMENT_TYPES = [
  { value: 'RUT', label: 'RUT (Chile)' },
  { value: 'CI', label: 'Cédula de Identidad' },
  { value: 'CC', label: 'Cédula de Ciudadanía (Colombia)' },
  { value: 'DNI', label: 'DNI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const KycLevel2Form = ({ onSuccess }) => {
  const { user, updateUserSession } = useAuth();

  // Step 1: personal data
  const [step, setStep] = useState(1);
  const [personalData, setPersonalData] = useState({
    documentType: user?.documentType || '',
    documentNumber: user?.documentNumber || '',
    phoneNumber: user?.phoneNumber || '',
  });

  // Step 2: document photos
  const [files, setFiles] = useState({ idFront: null, idBack: null, selfie: null });
  const [previews, setPreviews] = useState({ idFront: null, idBack: null, selfie: null });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Guard: already submitted or approved
  if (user?.kyc?.status === 'pending' || user?.kyc?.status === 'approved') {
    return (
      <Alert variant={user.kyc.status === 'approved' ? 'success' : 'info'} className="mb-0">
        <strong>
          {user.kyc.status === 'approved' ? '✅ Identidad verificada' : '⏳ Documentos en revisión'}
        </strong>
        <div className="small mt-1">
          {user.kyc.status === 'pending'
            ? 'Tus documentos están siendo revisados por nuestro equipo.'
            : '¡Tu identidad ha sido verificada exitosamente!'}
        </div>
      </Alert>
    );
  }

  // ── Step 1 handlers ──────────────────────────────────────────────────────

  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!personalData.documentType) { setError('Selecciona el tipo de documento.'); return; }
    if (!personalData.documentNumber.trim()) { setError('Ingresa tu número de documento.'); return; }
    if (!personalData.phoneNumber.trim()) { setError('Ingresa tu número de teléfono.'); return; }

    setLoading(true);
    setError('');
    try {
      const nameParts = (user?.name || '').split(' ');
      const response = await updateUserProfile({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        documentType: personalData.documentType,
        documentNumber: personalData.documentNumber.trim(),
        phoneNumber: personalData.phoneNumber.trim(),
      });
      if (response.ok && response.user) {
        updateUserSession({ ...user, ...response.user });
        setStep(2);
      } else {
        throw new Error(response.error || 'Error al guardar los datos.');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar los datos. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 handlers ──────────────────────────────────────────────────────

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(`La imagen es demasiado grande (máx. 5MB).`);
      return;
    }
    setFiles(prev => ({ ...prev, [fieldName]: file }));
    setPreviews(prev => ({ ...prev, [fieldName]: URL.createObjectURL(file) }));
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
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('idFront', files.idFront);
      formData.append('idBack', files.idBack);
      formData.append('selfie', files.selfie);

      const response = await uploadKycDocuments(formData);
      if (response.ok) {
        setSuccess('Documentos enviados correctamente. Tu cuenta está en revisión.');
        updateUserSession({ ...user, kyc: response.kyc });
        if (onSuccess) setTimeout(() => onSuccess(), 2000);
      } else {
        throw new Error(response.error || 'Error al subir los documentos.');
      }
    } catch (err) {
      setError(err.message || err.error || 'Error al subir los documentos. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Step indicator */}
      <div className="d-flex align-items-center mb-4 gap-2">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
          style={{
            width: 28, height: 28, fontSize: '0.8rem',
            backgroundColor: step >= 1 ? '#0d6efd' : '#dee2e6',
            color: step >= 1 ? '#fff' : '#6c757d',
          }}
        >1</div>
        <div style={{ flex: 1, height: 2, backgroundColor: step >= 2 ? '#0d6efd' : '#dee2e6' }} />
        <div
          className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
          style={{
            width: 28, height: 28, fontSize: '0.8rem',
            backgroundColor: step >= 2 ? '#0d6efd' : '#dee2e6',
            color: step >= 2 ? '#fff' : '#6c757d',
          }}
        >2</div>
      </div>

      {/* ── STEP 1: Personal data ── */}
      {step === 1 && (
        <Form onSubmit={handleStep1Submit}>
          <p className="text-secondary small mb-3">
            <strong>Paso 1 de 2 —</strong> Datos personales
          </p>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-medium text-secondary">Tipo de documento</Form.Label>
            <Form.Select
              name="documentType"
              value={personalData.documentType}
              onChange={handlePersonalChange}
              className="rounded-3"
              style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}
            >
              <option value="">Selecciona un tipo...</option>
              {DOCUMENT_TYPES.map(dt => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-medium text-secondary">Número de documento</Form.Label>
            <Form.Control
              type="text"
              name="documentNumber"
              value={personalData.documentNumber}
              onChange={handlePersonalChange}
              placeholder="Ej: 12.345.678-9"
              className="rounded-3"
              style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="small fw-medium text-secondary">Teléfono</Form.Label>
            <Form.Control
              type="tel"
              name="phoneNumber"
              value={personalData.phoneNumber}
              onChange={handlePersonalChange}
              placeholder="+56 9 1234 5678"
              className="rounded-3"
              style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}
            />
          </Form.Group>

          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Button
            type="submit"
            variant="primary"
            className="w-100 rounded-pill fw-bold py-2"
            disabled={loading}
          >
            {loading ? <><Spinner size="sm" className="me-2" />Guardando...</> : 'Continuar →'}
          </Button>
        </Form>
      )}

      {/* ── STEP 2: Document photos ── */}
      {step === 2 && (
        <Form onSubmit={handleStep2Submit}>
          <p className="text-secondary small mb-3">
            <strong>Paso 2 de 2 —</strong> Sube tus documentos
          </p>

          <Row className="mb-3">
            <Col xs={6}>
              <Form.Group>
                <Form.Label className="small fw-medium text-secondary">Documento (Frente)</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'idFront')}
                  className="rounded-3"
                  style={{ background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: '0.8rem' }}
                />
                {previews.idFront && (
                  <Image src={previews.idFront} thumbnail className="mt-2" style={{ maxHeight: '100px', width: '100%', objectFit: 'cover' }} />
                )}
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group>
                <Form.Label className="small fw-medium text-secondary">Documento (Reverso)</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'idBack')}
                  className="rounded-3"
                  style={{ background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: '0.8rem' }}
                />
                {previews.idBack && (
                  <Image src={previews.idBack} thumbnail className="mt-2" style={{ maxHeight: '100px', width: '100%', objectFit: 'cover' }} />
                )}
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label className="small fw-medium text-secondary">Selfie sosteniendo tu documento</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'selfie')}
              className="rounded-3"
              style={{ background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: '0.8rem' }}
            />
            <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
              Asegúrate de que tu rostro y documento estén bien iluminados y legibles.
            </Form.Text>
            {previews.selfie && (
              <div className="mt-2">
                <Image src={previews.selfie} thumbnail style={{ maxHeight: '150px' }} />
              </div>
            )}
          </Form.Group>

          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
          {success && <Alert variant="success" className="py-2 small">{success}</Alert>}

          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              className="rounded-pill fw-normal py-2"
              style={{ minWidth: 90 }}
              onClick={() => { setError(''); setStep(1); }}
              disabled={loading}
            >
              ← Volver
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-grow-1 rounded-pill fw-bold py-2"
              disabled={loading}
            >
              {loading
                ? <><Spinner size="sm" className="me-2" />Subiendo...</>
                : 'Enviar para Revisión'}
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
};

export default KycLevel2Form;
