import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from '../FinancialManager.module.css';
import { FaDownload } from 'react-icons/fa';

const DataExporter = () => {
  const [exporting, setExporting] = useState(null);

  const handleExport = async (collectionName, fileName) => {
    setExporting(collectionName);
    toast.loading(`Exportando ${fileName}...`);

    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (data.length === 0) {
        toast.dismiss();
        toast.error('No hay datos para exportar en esta colección.');
        setExporting(null);
        return;
      }

      const flattenedData = data.map(row => {
        const flatRow = {};
        for (const key in row) {
          if (typeof row[key] === 'object' && row[key] !== null) {
            if (row[key].toDate) { 
              flatRow[key] = row[key].toDate().toISOString();
            } else {
              flatRow[key] = JSON.stringify(row[key]);
            }
          } else {
            flatRow[key] = row[key];
          }
        }
        return flatRow;
      });
      
      const headers = Object.keys(flattenedData[0]);
      // --- CAMBIO CLAVE: Usamos punto y coma como separador ---
      let csvContent = headers.join(';') + '\n';

      flattenedData.forEach(row => {
        const values = headers.map(header => {
          let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
          // Escapa comillas dobles dentro del texto duplicándolas
          cell = cell.replace(/"/g, '""');
          // Si la celda contiene el separador (punto y coma), saltos de línea o comillas, la encerramos entre comillas
          if (cell.search(/("|\n|;)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        });
        // --- CAMBIO CLAVE: Usamos punto y coma como separador ---
        csvContent += values.join(';') + '\n';
      });

      // --- CAMBIO CLAVE: Añadimos el BOM para compatibilidad con Excel ---
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_backup_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.dismiss();
      toast.success('¡Exportación completada!');
    } catch (error) {
      toast.dismiss();
      toast.error('Error al exportar los datos.');
      console.error("Error exporting data: ", error);
    } finally {
      setExporting(null);
    }
  };

  const collectionsToExport = [
    { name: 'registrosFinancieros', label: 'Registros Financieros' },
    { name: 'inventoryItems', label: 'Inventario' },
    { name: 'products', label: 'Productos' },
    { name: 'productionOrders', label: 'Órdenes de Producción' },
    { name: 'users', label: 'Usuarios' },
    { name: 'pendingChecks', label: 'Cheques Pendientes' },
  ];

  return (
    <div className={styles.exporterGrid}>
      {collectionsToExport.map(col => (
        <button
          key={col.name}
          className={styles.exportButton}
          onClick={() => handleExport(col.name, col.label)}
          disabled={exporting}
        >
          <FaDownload />
          {exporting === col.name ? 'Exportando...' : `Exportar ${col.label}`}
        </button>
      ))}
    </div>
  );
};

export default DataExporter;

