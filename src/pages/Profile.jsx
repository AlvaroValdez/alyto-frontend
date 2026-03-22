import React, { useState } from 'react';
import { Container, Row, Col, Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { uploadAvatar, updateUserProfile } from '../services/api';
import { toast } from 'sonner';
import KycLevel2Form from '../components/auth/KycLevel2Form';
import KybLevel2Form from '../components/auth/KybLevel2Form';

const Profile = () => {
  const { user, updateUserSession } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phoneNumber: user?.phoneNumber || '',
    address: user?.address || '',
  });

  const getKycStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge bg="success">Verificado</Badge>;
      case 'pending': return <Badge bg="warning" text="dark">En Revisión</Badge>;
      case 'rejected': return <Badge bg="danger">Rechazado</Badge>;
      default: return <Badge bg="secondary">No Verificado</Badge>;
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('avatar', file);
    setUploading(true);
    const toastId = toast.loading('Subiendo foto de perfil...');
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
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleOpenEditModal = () => {
    setFormData({
      name: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      address: user?.address || '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await updateUserProfile({
        firstName: formData.name.split(' ')[0],
        lastName: formData.name.split(' ').slice(1).join(' '),
        phoneNumber: formData.phoneNumber,
        address: formData.address,
      });
      if (response.ok && response.user) {
        updateUserSession({ ...user, ...response.user });
        toast.success('Perfil actualizado correctamente');
        setShowEditModal(false);
      } else {
        throw new Error(response.error || 'Error al actualizar');
      }
    } catch (err) {
      toast.error(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8F9FD', color: '#333', minHeight: '100vh', paddingBottom: '80px', paddingTop: '20px' }}>
      <Container className="px-3" style={{ maxWidth: '600px' }}>

        {/* --- 1. HEADER ROW: Texts Left, Avatar Right --- */}
        <div className="d-flex justify-content-between align-items-center mb-4 mt-4">

          <div className="text-start">
            <h1 className="fw-normal mb-0 text-dark" style={{ fontSize: '2rem', letterSpacing: '-0.5px' }}>
              {user?.name || 'Usuario'}
            </h1>
            <div className="text-secondary" style={{ fontSize: '1.1rem' }}>
              {user?.email}
            </div>
            <div className="mt-2">
              <Badge bg="primary" className="fw-normal rounded-pill px-3 py-1 bg-opacity-10 text-primary border border-primary">
                Cuenta {user?.accountType === 'business' ? 'Empresa' : 'Personal'}
              </Badge>
            </div>
          </div>

          {/* Avatar con estado de carga */}
          <div style={{ flexShrink: 0 }}>
            <div
              className="rounded-circle overflow-hidden shadow-sm"
              style={{
                width: '110px', height: '110px',
                backgroundColor: '#e9ecef', margin: '0 auto',
                backgroundImage: user?.avatar ? `url(${user.avatar})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '3px solid #F7C843',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading
                ? <Spinner animation="border" variant="primary" />
                : (!user?.avatar && <span className="fw-bold" style={{ fontSize: '32px', color: '#6c757d' }}>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>)
              }
            </div>
          </div>

        </div>

        {/* --- 2. KYC Status --- */}
        <div className="d-flex mb-4">
          <div className="me-5">
            <div className="text-uppercase text-secondary mb-1" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Nivel KYC</div>
            <div className="fs-5 fw-medium text-dark">{user?.kyc?.level || 1}</div>
          </div>
          <div>
            <div className="text-uppercase text-secondary mb-1" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Estado</div>
            <div className="fs-5 fw-medium text-dark d-flex align-items-center">
              {user?.kyc?.status === 'approved' ? (
                <><span className="text-success me-2">●</span> Verificado</>
              ) : user?.kyc?.status === 'pending' ? (
                <><span className="text-warning me-2">●</span> En Revisión</>
              ) : (
                <><span className="text-secondary me-2">●</span> Básico</>
              )}
            </div>
          </div>
        </div>

        {/* --- 3. ACTIONS ROW --- */}
        <div className="d-flex gap-3 mb-5">
          {/* Editar Foto — label wraps hidden input */}
          <label
            htmlFor="profile-photo-input"
            className="btn btn-outline-primary rounded-pill px-4 fw-normal mb-0"
            style={{ fontSize: '0.9rem', cursor: uploading ? 'not-allowed' : 'pointer', pointerEvents: uploading ? 'none' : 'auto' }}
          >
            {uploading ? <><Spinner size="sm" className="me-1" />Subiendo...</> : 'Editar Foto'}
          </label>
          <input
            id="profile-photo-input"
            type="file"
            className="d-none"
            accept="image/*"
            onChange={handleAvatarChange}
          />

          {/* Editar Perfil */}
          <Button
            variant="outline-primary"
            className="rounded-pill px-4 fw-normal"
            style={{ fontSize: '0.9rem' }}
            onClick={handleOpenEditModal}
          >
            <i className="bi bi-pencil me-1"></i>Editar Perfil
          </Button>
        </div>

        <hr style={{ borderColor: '#dee2e6' }} className="mb-4" />

        {/* --- 4. Limits & Info --- */}
        <div className="mb-4">
          <div className="text-uppercase text-secondary mb-3" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Límites Transaccionales</div>

          <Row className="text-center text-md-start">
            <Col xs={3}>
              <div className="fs-3 fw-normal text-primary">{user?.kyc?.level || 1}</div>
              <div className="text-secondary text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>Nivel<br />Actual</div>
            </Col>
            <Col xs={4}>
              <div className="fs-3 fw-normal text-primary">450k</div>
              <div className="text-secondary text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>Límite<br />Diario</div>
            </Col>
            <Col xs={5}>
              <div className="fs-3 fw-normal text-success">
                {user?.kyc?.level === 3 ? 'Ilimitado' : (user?.kyc?.level === 2 ? '4.5M' : '450k')}
              </div>
              <div className="text-secondary text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>Monto<br />Permitido</div>
            </Col>
          </Row>
        </div>

        <hr style={{ borderColor: '#dee2e6' }} className="mb-4" />

        {/* --- 5. Datos de Seguridad --- */}
        <div className="mb-4">
          <div className="text-uppercase text-secondary mb-3" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Datos de Seguridad</div>

          {user?.accountType === 'business' ? (
            <>
              <div className="d-flex justify-content-between py-3 border-bottom" style={{ borderColor: '#e9ecef' }}>
                <div className="d-flex align-items-center">
                  <i className="bi bi-briefcase text-primary me-3 fs-5"></i>
                  <span className="text-dark fw-medium">Razón Social</span>
                </div>
                <div className="text-secondary">{user?.business?.name || 'Pendiente'}</div>
              </div>
              <div className="d-flex justify-content-between py-3 border-bottom" style={{ borderColor: '#e9ecef' }}>
                <div className="d-flex align-items-center">
                  <i className="bi bi-hash text-primary me-3 fs-5"></i>
                  <span className="text-dark fw-medium">ID Fiscal</span>
                </div>
                <div className="text-secondary">{user?.business?.taxId || 'Pendiente'}</div>
              </div>
            </>
          ) : (
            <>
              <div className="d-flex justify-content-between py-3 border-bottom" style={{ borderColor: '#e9ecef' }}>
                <div className="d-flex align-items-center">
                  <i className="bi bi-telephone text-primary me-3 fs-5"></i>
                  <span className="text-dark fw-medium">Teléfono</span>
                </div>
                <div className="text-secondary">{user?.phoneNumber || 'No registrado'}</div>
              </div>
              <div className="d-flex justify-content-between py-3 border-bottom" style={{ borderColor: '#e9ecef' }}>
                <div className="d-flex align-items-center">
                  <i className="bi bi-card-text text-primary me-3 fs-5"></i>
                  <span className="text-dark fw-medium">Documento</span>
                </div>
                <div className="text-secondary">{user?.documentNumber || 'No registrado'}</div>
              </div>
            </>
          )}
        </div>

        {/* --- 6. KYC Upgrade Form --- */}
        {(!user?.kyc?.status || user?.kyc?.status !== 'approved') && (
          <div className="mt-5 p-4 rounded bg-white shadow-sm border border-light">
            <h5 className="text-dark mb-3 fw-bold">Sube de Nivel KYC</h5>
            <p className="text-secondary small mb-4">Aumenta tus límites de envío subiendo tus documentos.</p>
            <div className="bg-light rounded p-3">
              {user?.accountType === 'business' ? <KybLevel2Form /> : <KycLevel2Form />}
            </div>
          </div>
        )}

      </Container>

      {/* --- MODAL: Editar Perfil --- */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-dark" style={{ fontSize: '1.1rem' }}>
            Editar Perfil
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-4">
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="text-secondary small fw-medium">Nombre completo</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                className="rounded-3"
                style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}
                placeholder="Tu nombre completo"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-secondary small fw-medium">Teléfono</Form.Label>
              <Form.Control
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(f => ({ ...f, phoneNumber: e.target.value }))}
                className="rounded-3"
                style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}
                placeholder="+56 9 1234 5678"
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="text-secondary small fw-medium">Dirección</Form.Label>
              <Form.Control
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))}
                className="rounded-3"
                style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}
                placeholder="Tu dirección"
              />
            </Form.Group>
            <Button
              variant="primary"
              className="w-100 rounded-pill fw-bold py-2"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? <><Spinner size="sm" className="me-2" />Guardando...</> : 'Guardar Cambios'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
};

export default Profile;
