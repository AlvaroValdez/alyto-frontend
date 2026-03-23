import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import logo from '../assets/images/logo.png';
import ReceiptContent from './ReceiptContent';

const ReceiptModal = ({ show, onHide, transaction, orderId }) => {
    const receiptId = orderId || transaction?.order || 'alyto';

    const captureCanvas = async () => {
        const el = document.getElementById('receipt-modal-capture');
        if (!el) return null;

        const savedScroll = window.scrollY;
        window.scrollTo(0, 0);
        await new Promise(r => requestAnimationFrame(r));

        const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.scrollHeight,
            logging: false,
        });

        window.scrollTo(0, savedScroll);
        return canvas;
    };

    const handleDownloadImage = async () => {
        const toastId = toast.loading('Generando imagen...');
        try {
            const canvas = await captureCanvas();
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = `comprobante-${receiptId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Imagen guardada', { id: toastId });
        } catch (err) {
            console.error('Error generando imagen:', err);
            toast.error('Error al generar imagen', { id: toastId });
        }
    };


    const handleWhatsAppShare = async () => {
        if (!transaction) return;
        const at = transaction.amountsTracking || {};
        const rt = transaction.rateTracking || {};

        const originCurrency = at.originCurrency || transaction.currency || '';
        const originTotal = at.originTotal ?? transaction.amount ?? 0;
        const destReceive = at.destReceiveAmount ?? rt.destAmount ?? 0;
        const destCurrency = at.destCurrency || rt.destCurrency || '';

        const benefName = [
            transaction.beneficiary_first_name || transaction.withdrawalPayload?.beneficiary_first_name,
            transaction.beneficiary_last_name || transaction.withdrawalPayload?.beneficiary_last_name
        ].filter(Boolean).join(' ');

        const lines = [
            '🏦 *Comprobante de Transferencia Alyto*', '',
            `💸 Enviado: ${originCurrency} ${Number(originTotal).toLocaleString('es-CL')}`,
            destReceive ? `✅ Beneficiario recibe: ${destCurrency} ${Number(destReceive).toLocaleString('es-CL')}` : '',
            benefName ? `👤 Beneficiario: ${benefName}` : '',
            rt.alytoRate ? `📊 Tasa: 1 ${originCurrency} = ${rt.alytoRate} ${destCurrency}` : '',
            `📋 ID: ${receiptId}`, '',
            '_Transferencia procesada por Alyto_'
        ].filter(l => l !== '');

        const text = lines.join('\n');
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleNativeShare = async () => {
        const toastId = toast.loading('Preparando imagen...');
        try {
            const canvas = await captureCanvas();
            if (!canvas) return;

            canvas.toBlob(async (blob) => {
                const file = new File([blob], `comprobante-${receiptId}.png`, { type: 'image/png' });
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Comprobante Alyto' });
                    toast.success('Compartido', { id: toastId });
                } else {
                    // Fallback: download
                    const link = document.createElement('a');
                    link.download = file.name;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    toast.success('Imagen guardada', { id: toastId });
                }
            }, 'image/png');
        } catch (err) {
            if (err.name !== 'AbortError') {
                toast.error('Error al compartir', { id: toastId });
            } else {
                toast.dismiss(toastId);
            }
        }
    };

    if (!transaction) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered scrollable>
            <Modal.Body className="px-0 py-0">
                {/* Close button */}
                <button
                    type="button"
                    className="btn-close position-absolute"
                    style={{ top: '12px', right: '12px', zIndex: 10 }}
                    onClick={onHide}
                    aria-label="Cerrar"
                />

                {/* Capturable area (no close button inside) */}
                <div id="receipt-modal-capture" style={{ backgroundColor: '#fff', padding: '24px' }}>
                    <div className="text-center mb-4">
                        <img src={logo} alt="Alyto" style={{ height: '80px' }} />
                    </div>
                    <ReceiptContent transaction={transaction} orderId={orderId} />
                </div>
            </Modal.Body>

            <Modal.Footer className="border-0 pt-0 gap-2 flex-wrap">
                <Button
                    variant="success"
                    onClick={handleWhatsAppShare}
                    style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                >
                    <i className="bi bi-whatsapp me-1"></i>
                    WhatsApp
                </Button>
                <Button variant="outline-primary" onClick={handleNativeShare}>
                    <i className="bi bi-image me-1"></i>
                    Guardar imagen
                </Button>
                <Button variant="outline-secondary" onClick={onHide} className="ms-auto">
                    <i className="bi bi-x-circle me-1"></i>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ReceiptModal;
