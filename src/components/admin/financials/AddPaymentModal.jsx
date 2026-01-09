import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
// Reutilizamos estilos de otros modales
import modalStyles from '../production/ProductionLogModal.module.css';
// --- ▼▼▼ ¡RUTA CORREGIDA! Apunta a la ubicación real de tu CSS de contactos ▼▼▼ ---
import formStyles from '../../../pages/admin/contacts/ContactForm.module.css';
// --- ▲▲▲ ¡RUTA CORREGIDA! ---
import { FaTimes, FaSave, FaDollarSign } from 'react-icons/fa';

// Lista de categorías de gasto
const EXPENSE_CATEGORIES = [
  'Materia Prima', 'Salarios', 'Alquiler', 'Servicios Públicos (Luz, Agua, Gas, Internet)',
  'Comisiones Concesionarios', 'Herramientas', 'Marketing y Publicidad', 'Honorarios',
  'Artículos de Oficina y Limpieza', 'Mantenimiento y Reparaciones', 'Combustible y Viáticos',
  'Impuestos y Tasas', 'Intereses y Comisiones Bancarias', 'Otros Gastos'
];

// Helper para formatear (puedes moverlo a un archivo utils si se repite mucho)
const formatCurrency = (value, withDecimals = false) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(value || 0);
};

const AddPaymentModal = ({ payable, onClose, onPaymentDone }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const montoTotal = payable.montoTotal || 0;
  const montoPagado = payable.montoPagado || 0;
  const montoRestante = montoTotal - montoPagado;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return toast.error('El monto a pagar debe ser un número positivo.');
    }
    // Permitir pago mayor al restante si es necesario (ej. nota de crédito), o restringir:
    if (paymentAmount > montoRestante) {
      // Quité el toFixed(2) para comparar números directamente
      return toast.error(`El pago (${formatCurrency(paymentAmount)}) no puede superar el monto restante (${formatCurrency(montoRestante)}).`);
    }

    setIsSubmitting(true);
    toast.loading('Registrando pago parcial...');

    const payableRef = doc(db, 'pendingPayables', payable.id);
    const financialRecordsRef = collection(db, 'registrosFinancieros');

    const newMontoPagado = montoPagado + paymentAmount;
    // Comprobar si está pagado (con un pequeño margen de error para floats)
    const isPaid = newMontoPagado >= (montoTotal - 0.001); 
    const newStatus = isPaid ? 'pagado' : 'pendiente';

    try {
      // 1. Crear el registro de egreso
      await addDoc(financialRecordsRef, {
        type: 'egreso',
        amount: paymentAmount,
        concept: `Pago a ${payable.proveedor}: ${payable.concepto || 'S/C'}`,
        category: category,
        date: serverTimestamp(),
        isManual: false,
        linkedPayableId: payable.id
      });

      // 2. Actualizar la cuenta por pagar
      await updateDoc(payableRef, {
        montoPagado: increment(paymentAmount), // Usar increment para evitar concurrencia
        status: newStatus // Actualiza el estado
      });

      toast.dismiss();
      toast.success('¡Pago registrado con éxito!');
      onPaymentDone();
    } catch (error) {
      toast.dismiss();
      toast.error('Error al registrar el pago.');
      console.error("Error adding payment: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={modalStyles.modalOverlay}>
      <div className={`${modalStyles.modalContent} ${formStyles.contactModalContent}`} style={{ maxWidth: '600px' }}>
        <div className={modalStyles.modalHeader}>
          <h3><FaDollarSign /> Registrar Pago</h3>
          <button onClick={onClose} className={modalStyles.closeButton}><FaTimes /></button>
        </div>
        
        <div className={modalStyles.orderDetails}>
          <p><strong>Proveedor:</strong> {payable.proveedor}</p>
          <p><strong>Concepto:</strong> {payable.concepto || 'N/A'}</p>
          <p><strong>Monto Total:</strong> {formatCurrency(montoTotal)}</p>
          <p><strong>Monto Pagado:</strong> {formatCurrency(montoPagado)}</p>
          <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: montoRestante > 0 ? '#dc3545' : '#198754' }}>
            Monto Restante: {formatCurrency(montoRestante)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.contactForm}>
          <div className={formStyles.formGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className={formStyles.formGroup}>
              <label htmlFor="amount">Monto a Pagar</label>
              <input
                type="number"
                step="0.01"
                id="amount"
                name="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="category">Categoría del Gasto</label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
          
          <div className={modalStyles.modalActions}>
            <button
              type="submit"
              className={`${modalStyles.actionButton} ${modalStyles.submitButton}`}
              disabled={isSubmitting}
            >
              <FaSave /> {isSubmitting ? 'Guardando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentModal;