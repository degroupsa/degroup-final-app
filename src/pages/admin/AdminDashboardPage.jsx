import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import toast from 'react-hot-toast';
import KPI from '../../components/dashboard/KPI.jsx';
import LatestOrdersTable from '../../components/dashboard/LatestOrdersTable.jsx';
import { FaDollarSign, FaShoppingCart, FaUsers, FaWarehouse, FaRegChartBar, FaChartPie } from 'react-icons/fa';
import QuoteRequestsWidget from '../../components/QuoteRequestsWidget.jsx';
import FinancialManager from '../../components/FinancialManager.jsx';
import styles from './AdminDashboardPage.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersSnap, productsSnap, usersSnap, inventorySnap, recipesSnap, recordsSnap, productionSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'inventoryItems')),
        getDocs(collection(db, 'productRecipes')),
        getDocs(collection(db, 'registrosFinancieros')),
        getDocs(collection(db, 'productionOrders')),
      ]);

      const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Órdenes encontradas por la consulta del Dashboard:", orders);
      const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const users = usersSnap.docs;
      const inventoryItems = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const recipes = recipesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const financialRecords = recordsSnap.docs.map(doc => doc.data());
      const productionOrders = productionSnap.docs.map(doc => doc.data());

      const manualIncome = financialRecords.filter(r => r.type === 'ingreso').reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalExpense = financialRecords.filter(r => r.type === 'gasto').reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalOrders = orders.length;
      const totalRevenueFromOrders = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenueFromOrders / totalOrders : 0;
      const totalCustomers = users.filter(u => u.data().role === 'cliente' || u.data().role === 'concesionario').length;
      const inventoryValue = inventoryItems.reduce((sum, item) => sum + ((parseFloat(item.stock) || 0) * (parseFloat(item.costoPorUnidad) || 0)), 0);
      const finishedGoodsValue = recipes.reduce((sum, recipe) => {
        const recipeCost = (recipe.components || []).reduce((cost, comp) => {
          const itemInfo = inventoryItems.find(invItem => invItem.id === comp.idPieza);
          return cost + ((parseFloat(itemInfo?.costoPorUnidad) || 0) * (comp.quantityNeeded || 0));
        }, 0);
        return sum + ((parseFloat(recipe.stockFinished) || 0) * recipeCost);
      }, 0);
      const totalInventoryValue = inventoryValue + finishedGoodsValue;

      const salesByMonth = {};
      const monthLabels = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('es-AR', { month: 'short', year: '2-digit' });
        monthLabels.push(monthLabel);
        salesByMonth[monthLabel] = 0;
      }
      orders.forEach(order => {
        if (order.createdAt?.seconds) {
          const orderDate = new Date(order.createdAt.seconds * 1000);
          const monthLabel = orderDate.toLocaleString('es-AR', { month: 'short', year: '2-digit' });
          if (salesByMonth.hasOwnProperty(monthLabel)) { salesByMonth[monthLabel] += order.total || 0; }
        }
      });
      const monthlySalesChart = { labels: monthLabels, datasets: [{ label: 'Ingresos por Órdenes ($)', data: Object.values(salesByMonth), backgroundColor: '#0d6efd' }] };
      const productionStatusCounts = productionOrders.reduce((acc, order) => {
        const status = order.currentStatus || 'Desconocido';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      const productionStatusChartData = { labels: Object.keys(productionStatusCounts), datasets: [{ data: Object.values(productionStatusCounts), backgroundColor: ['#ffc107', '#17a2b8', '#6f42c1', '#20c997', '#fd7e14', '#dc3545', '#28a745'] }] };
      const salesByCustomer = orders.reduce((acc, order) => {
        const customerName = order.buyer?.name || 'Cliente Anónimo';
        acc[customerName] = (acc[customerName] || 0) + (order.total || 0);
        return acc;
      }, {});
      const topCustomers = Object.entries(salesByCustomer).sort(([, a], [, b]) => b - a).slice(0, 5);
      const topCustomersChart = { labels: topCustomers.map(([name,]) => name), datasets: [{ label: 'Total Comprado ($)', data: topCustomers.map(([, sales]) => sales), backgroundColor: '#6f42c1' }] };
      const expensesByCategory = financialRecords.filter(r => r.type === 'gasto').reduce((acc, record) => {
        const category = record.category || 'Sin Categoría';
        acc[category] = (acc[category] || 0) + record.amount;
        return acc;
      }, {});
      const expenseChart = { labels: Object.keys(expensesByCategory), datasets: [{ data: Object.values(expensesByCategory), backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#6c757d'] }] };
      const quantityByProduct = orders.flatMap(o => o.items || []).reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + (item.quantity || 0);
        return acc;
      }, {});
      const topProductsByQuantity = Object.entries(quantityByProduct).sort(([, a], [, b]) => b - a).slice(0, 5);
      const topProductsByQuantityChart = { labels: topProductsByQuantity.map(([name,]) => name), datasets: [{ label: 'Unidades Vendidas', data: topProductsByQuantity.map(([, qty]) => qty), backgroundColor: '#198754' }] };

      setDashboardData({
        kpis: { totalIncome: manualIncome, totalExpense, totalOrders, totalCustomers, totalInventoryValue, averageOrderValue },
        charts: { monthlySalesChart, productionStatusChart: productionStatusChartData, topCustomersChart, expenseChart, topProductsByQuantityChart },
        latestOrders: orders.slice(0, 5)
      });
    } catch (error) {
      console.error("Error al procesar datos del dashboard:", error);
      toast.error("No se pudieron cargar los datos del dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };
  const barChartOptions = { ...chartOptions, indexAxis: 'y' };

  return (
    <div className={styles.pageContent}>
      <div className={styles.pageHeader}>
        <h1>Dashboard Financiero DE Group</h1>
        <p className={styles.subtitle}>Gestión Financiera de la empresa.</p>
      </div>

      {loading ? <p>Cargando y calculando datos...</p> : dashboardData && (
        <>
          <div className={styles.kpiGrid}>
            <KPI title="Ingresos (Manuales)" value={`$${dashboardData.kpis.totalIncome?.toLocaleString('es-AR')}`} icon={<FaDollarSign />} color="#198754" />
            <KPI title="Gastos Totales" value={`$${dashboardData.kpis.totalExpense?.toLocaleString('es-AR')}`} icon={<FaRegChartBar />} color="#dc3545" />
            <KPI title="Total de Órdenes" value={dashboardData.kpis.totalOrders} icon={<FaShoppingCart />} color="#0d6efd" />
            <KPI title="Ticket Promedio" value={`$${dashboardData.kpis.averageOrderValue?.toLocaleString('es-AR', {maximumFractionDigits: 0})}`} icon={<FaChartPie />} color="#17a2b8" />
            <KPI title="Valor del Inventario" value={`$${dashboardData.kpis.totalInventoryValue?.toLocaleString('es-AR')}`} icon={<FaWarehouse />} color="#fd7e14" />
            <KPI title="Clientes Registrados" value={dashboardData.kpis.totalCustomers} icon={<FaUsers />} color="#6f42c1" />
          </div>

          <div className={styles.mainChartsGrid}>
            <div className={styles.chartContainer}>
              <h3>Ingresos por Presupuestos (Últimos 6 Meses)</h3>
              <div className={styles.chartWrapper}><Bar data={dashboardData.charts.monthlySalesChart} options={chartOptions} /></div>
            </div>
            <div className={styles.chartContainer}>
              <h3>Top 5 Clientes por Compras</h3>
              <div className={styles.chartWrapper}><Bar data={dashboardData.charts.topCustomersChart} options={barChartOptions} /></div>
            </div>
          </div>
          
          <div className={styles.dualPieChartContainer}>
            <div className={styles.chartContainer}>
              <h3>Equipos en Producción por Estado</h3>
              <div className={styles.chartWrapper}><Doughnut data={dashboardData.charts.productionStatusChart} options={chartOptions} /></div>
            </div>
            <div className={styles.chartContainer}>
              <h3>Gastos por Categoría</h3>
              <div className={styles.chartWrapper}><Pie data={dashboardData.charts.expenseChart} options={chartOptions} /></div>
            </div>
          </div>

          <div className={styles.bottomWidgetsGrid}>
            <div className={styles.chartContainer}>
              <h3>Top 5 Productos (por Cantidad Vendida)</h3>
              <div className={styles.chartWrapper}><Bar data={dashboardData.charts.topProductsByQuantityChart} options={barChartOptions} /></div>
            </div>
            <div className={styles.chartContainer}>
              <h3>Últimos 5 Presupuestos</h3>
              <LatestOrdersTable orders={dashboardData.latestOrders} />
            </div>
          </div>

          <hr className={styles.divider} />
          
          <div className={styles.bottomWidgetsContainer}>
            <div className={styles.card}><FinancialManager /></div>
            <div className={styles.card}><QuoteRequestsWidget /></div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;