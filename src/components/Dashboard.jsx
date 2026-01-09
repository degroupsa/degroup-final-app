import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs, query } from 'firebase/firestore';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import styles from './Dashboard.module.css';

// Registramos todos los componentes de Chart.js que vamos a usar
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Dashboard() {
  // Estados para cada pieza de información
  const [kpis, setKpis] = useState({ 
    totalIncome: 0, 
    totalExpense: 0, 
    netProfit: 0, 
    profitMargin: 0, 
    quoteConversionRate: 0 
  });
  const [salesByRoleData, setSalesByRoleData] = useState(null);
  const [topLocationsData, setTopLocationsData] = useState(null);
  const [topProductsData, setTopProductsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      
      const recordsRef = collection(db, 'registrosFinancieros');
      const ordersRef = collection(db, 'orders');
      const quotesRef = collection(db, 'quoteRequests');
      
      try {
        const [recordsSnapshot, ordersSnapshot, quotesSnapshot] = await Promise.all([
          getDocs(query(recordsRef)),
          getDocs(query(ordersRef)),
          getDocs(query(quotesRef))
        ]);

        // --- 1. PROCESAMIENTO FINANCIERO (KPIs) ---
        let totalIncome = 0;
        let totalExpense = 0;
        
        recordsSnapshot.docs.forEach(doc => {
          const record = doc.data();
          if (record.type === 'ingreso') {
            totalIncome += record.amount;
          } else if (record.type === 'gasto') {
            totalExpense += record.amount;
          }
        });
        
        const netProfit = totalIncome - totalExpense;
        const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
        
        const totalQuotes = quotesSnapshot.size;
        const totalOrders = ordersSnapshot.size;
        const quoteConversionRate = totalQuotes > 0 ? (totalOrders / totalQuotes) * 100 : 0;

        setKpis({ totalIncome, totalExpense, netProfit, profitMargin, quoteConversionRate });

        // --- 2. PROCESAMIENTO DE ÓRDENES (GRÁFICOS) ---
        const salesByRole = { cliente: 0, concesionario: 0 };
        const salesByLocation = {};
        const salesByProduct = {};
        
        ordersSnapshot.docs.forEach(orderDoc => {
          const order = orderDoc.data();
          const buyer = order.buyer || {};
          const items = order.items || [];
          
          const role = buyer.role || 'cliente';
          salesByRole[role] = (salesByRole[role] || 0) + order.total;

          const location = buyer.address || 'Sin Localidad';
          salesByLocation[location] = (salesByLocation[location] || 0) + order.total;
          
          items.forEach(item => {
            const productName = item.name || 'Producto Desconocido';
            salesByProduct[productName] = (salesByProduct[productName] || 0) + (item.price * item.quantity);
          });
        });
        
        // Preparar datos para Ventas por Segmento
        setSalesByRoleData({
          labels: ['Cliente Directo', 'Concesionario'],
          datasets: [{ data: [salesByRole.cliente, salesByRole.concesionario], backgroundColor: ['#0d6efd', '#198754'] }]
        });

        // Preparar datos para Top 5 Localidades
        const topLocations = Object.entries(salesByLocation).sort(([,a],[,b]) => b-a).slice(0, 5);
        setTopLocationsData({
            labels: topLocations.map(([name,]) => name),
            datasets: [{ data: topLocations.map(([,sales]) => sales), backgroundColor: ['#6f42c1', '#d63384', '#fd7e14', '#ffc107', '#6c757d'] }]
        });

        // Preparar datos para Top 5 Productos
        const topProducts = Object.entries(salesByProduct).sort(([,a],[,b]) => b-a).slice(0, 5);
        setTopProductsData({
            labels: topProducts.map(([name,]) => name),
            datasets: [{ label: 'Ventas ($)', data: topProducts.map(([,sales]) => sales), backgroundColor: '#343a40' }]
        });

      } catch (error) {
          console.error("Error al procesar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (loading) return <p>Calculando datos del dashboard...</p>;

  return (
    <div className={styles.dashboardContainer}>
      <h2>Dashboard de Negocio</h2>
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.income}`}>
          <h3>Ingresos</h3>
          <p className={styles.kpiValue}>${new Intl.NumberFormat('es-AR').format(kpis.totalIncome)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.expense}`}>
          <h3>Gastos</h3>
          <p className={styles.kpiValue}>${new Intl.NumberFormat('es-AR').format(kpis.totalExpense)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.profit}`}>
          <h3>Beneficio Neto</h3>
          <p className={styles.kpiValue}>${new Intl.NumberFormat('es-AR').format(kpis.netProfit)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.margin}`}>
          <h3>Margen %</h3>
          <p className={styles.kpiValue}>{kpis.profitMargin.toFixed(1)}%</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.profit}`}>
            <h3>Conversión (Pres. a Venta)</h3>
            <p className={styles.kpiValue}>{kpis.quoteConversionRate.toFixed(1)}%</p>
        </div>
      </div>
      
      <div className={styles.chartsGrid}>
        {salesByRoleData && salesByRoleData.datasets[0].data.some(d => d > 0) && (
          <div className={styles.chartContainer}>
            <h3>Ingresos por Segmentación</h3>
            <Doughnut data={salesByRoleData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </div>
        )}
        {topProductsData && topProductsData.labels.length > 0 && (
          <div className={styles.chartContainer}>
            <h3>Top 5 Productos (por Ingresos)</h3>
            <Bar data={topProductsData} options={{ responsive: true, indexAxis: 'y' }} />
          </div>
        )}
        {topLocationsData && topLocationsData.labels.length > 0 && (
          <div className={styles.chartContainer}>
            <h3>Top 5 Localidades (por Ingresos)</h3>
            <Pie data={topLocationsData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;