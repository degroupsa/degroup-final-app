import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import toast from 'react-hot-toast';
import KPI from '../../components/dashboard/KPI.jsx';
import LatestOrdersTable from '../../components/dashboard/LatestOrdersTable.jsx';
// --- CAMBIO: Añadimos nuevos iconos ---
import { FaDollarSign, FaShoppingCart, FaUsers, FaWarehouse, FaRegChartBar, FaChartPie, FaBalanceScale, FaFileInvoiceDollar, FaCashRegister, FaIndustry, FaTools } from 'react-icons/fa';
// --- FIN CAMBIO ---
import QuoteRequestsWidget from '../../components/QuoteRequestsWidget.jsx';
import FinancialManager from '../../components/FinancialManager.jsx';
import styles from './AdminDashboardPage.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
 
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
};

function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersSnap, usersSnap, inventorySnap, recipesSnap, recordsSnap, productionSnap, checksSnap, clientsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'inventoryItems')),
        getDocs(collection(db, 'productRecipes')),
        getDocs(collection(db, 'registrosFinancieros')),
        getDocs(collection(db, 'productionOrders')),
        getDocs(query(collection(db, 'pendingChecks'), where('status', '!=', 'cobrado'))),
        getDocs(collection(db, 'clients')),
      ]);

      const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const users = usersSnap.docs;
      const inventoryItems = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const recipes = recipesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const financialRecords = recordsSnap.docs.map(doc => doc.data());
      const productionOrders = productionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pendingChecks = checksSnap.docs.map(doc => doc.data());
      const clients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // --- CÁLCULOS DE KPI (Existentes) ---
      const manualIncome = financialRecords.filter(r => r.type === 'ingreso').reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalExpense = financialRecords.filter(r => r.type === 'gasto').reduce((sum, r) => sum + (r.amount || 0), 0);
      const balance = manualIncome - totalExpense;
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
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const checksToCollectThisMonth = pendingChecks.filter(cheque => {
          const dueDate = cheque.fechaCobro.toDate();
          return dueDate >= startOfMonth && dueDate <= endOfMonth;
        }).reduce((sum, cheque) => sum + cheque.monto, 0);
      const totalSalesRevenue = productionOrders
        .filter(order => order.productionType === 'for_delivery')
        .reduce((sum, order) => {
          const recipeInfo = recipes.find(r => r.id === order.recipeId);
          const price = recipeInfo ? (recipeInfo.price || 0) : 0;
          return sum + (price * (order.quantity || 0));
        }, 0);

      // --- ▼▼▼ NUEVOS CÁLCULOS KPI ▼▼▼ ---
      const activeProductionOrders = productionOrders.filter(order => order.currentStatus !== 'Entregado');
      let grossValueInProduction = 0;
      let totalMaterialCostInProduction = 0;

      activeProductionOrders.forEach(order => {
        const recipe = recipes.find(r => r.id === order.recipeId);
        const orderQuantity = order.quantity || 0;

        // Calcular Valor Bruto
        if (order.productionType === 'for_delivery') {
          grossValueInProduction += order.totalSaleValue || (order.unitSalePrice * orderQuantity) || 0;
        } else if (order.productionType === 'for_stock' && recipe) {
          grossValueInProduction += (recipe.price || 0) * orderQuantity;
        }

        // Calcular Costo de Materiales
        if (recipe && recipe.components) {
          let orderMaterialCost = 0;
          recipe.components.forEach(component => {
            const inventoryItem = inventoryItems.find(item => item.id === component.idPieza);
            const itemCost = parseFloat(inventoryItem?.costoPorUnidad) || 0;
            const quantityNeeded = component.quantityNeeded || 0;
            orderMaterialCost += (itemCost * quantityNeeded);
          });
          totalMaterialCostInProduction += (orderMaterialCost * orderQuantity);
        }
      });

      const netValueInProduction = grossValueInProduction - totalMaterialCostInProduction;
      // --- ▲▲▲ FIN NUEVOS CÁLCULOS KPI ▲▲▲ ---


      // --- CÁLCULOS DE GRÁFICOS (Existentes - Sin cambios) ---
      const productionIncomeByMonth = {};
      const monthLabels = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('es-AR', { month: 'short', year: '2-digit' }).replace('.', '').toLowerCase();
        monthLabels.push(monthLabel);
        productionIncomeByMonth[monthLabel] = 0;
      }
      const deliveredProductionOrders = productionOrders.filter(order => order.currentStatus === 'Entregado' && order.productionType === 'for_delivery');
      deliveredProductionOrders.forEach(order => {
          let deliveryDate = null;
          if (order.statusHistory?.length > 0) {
            const deliveredEntry = order.statusHistory.find(entry => entry.stepName === 'Entregado');
            if (deliveredEntry?.updatedAt) {
              deliveryDate = deliveredEntry.updatedAt instanceof Timestamp ? deliveredEntry.updatedAt.toDate() : new Date(deliveredEntry.updatedAt);
            }
          }
          if (!deliveryDate && order.createdAt) { deliveryDate = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt); }
          if (deliveryDate) {
            const monthLabel = deliveryDate.toLocaleString('es-AR', { month: 'short', year: '2-digit' }).replace('.', '').toLowerCase();
            const saleValue = order.totalSaleValue || (order.unitSalePrice * order.quantity) || 0;
            if (productionIncomeByMonth.hasOwnProperty(monthLabel)) { productionIncomeByMonth[monthLabel] += saleValue; }
          }
        });
      const monthlyProductionIncomeChart = { labels: monthLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)), datasets: [{ label: 'Ingresos por Producción ($)', data: Object.values(productionIncomeByMonth), backgroundColor: '#0d6efd' }] };
      const deliveredOrdersWithClient = productionOrders.filter(order => order.currentStatus === 'Entregado' && order.linkedClientId);
      const salesByProdCustomer = deliveredOrdersWithClient.reduce((acc, order) => { const clientId = order.linkedClientId; const saleValue = order.totalSaleValue || (order.unitSalePrice * order.quantity) || 0; acc[clientId] = (acc[clientId] || 0) + saleValue; return acc; }, {});
      const topProdCustomersData = Object.entries(salesByProdCustomer).sort(([, a], [, b]) => b - a).slice(0, 5).map(([clientId, totalSales]) => { const clientInfo = clients.find(c => c.id === clientId); const clientName = clientInfo ? `${clientInfo.name || ''} ${clientInfo.lastName || ''}`.trim() : `ID: ${clientId.substring(0, 5)}...`; return { name: clientName || 'Cliente Desconocido', sales: totalSales }; });
      const topCustomersProductionChart = { labels: topProdCustomersData.map(c => c.name), datasets: [{ label: 'Total Comprado (Producción) ($)', data: topProdCustomersData.map(c => c.sales), backgroundColor: '#6f42c1' }] };
      const productionStatusCounts = productionOrders.reduce((acc, order) => { const status = order.currentStatus || 'Desconocido'; acc[status] = (acc[status] || 0) + (order.quantity || 1); return acc; }, {});
      const productionStatusChartData = { labels: Object.keys(productionStatusCounts), datasets: [{ data: Object.values(productionStatusCounts), backgroundColor: ['#ffc107', '#17a2b8', '#6f42c1', '#20c997', '#fd7e14', '#dc3545', '#28a745', '#0d6efd', '#6c757d', '#198754', '#e83e8c', '#adb5bd'] }] };
      const expensesByCategory = financialRecords.filter(r => r.type === 'gasto').reduce((acc, record) => { const category = record.category || 'Sin Categoría'; acc[category] = (acc[category] || 0) + record.amount; return acc; }, {});
      const expenseChart = { labels: Object.keys(expensesByCategory), datasets: [{ data: Object.values(expensesByCategory), backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#6c757d', '#17a2b8', '#6f42c1'] }] };
      const quantityByProduct = orders.flatMap(o => o.items || []).reduce((acc, item) => { acc[item.name] = (acc[item.name] || 0) + (item.quantity || 0); return acc; }, {});
      const topProductsByQuantity = Object.entries(quantityByProduct).sort(([, a], [, b]) => b - a).slice(0, 5);
      const topProductsByQuantityChart = { labels: topProductsByQuantity.map(([name,]) => name), datasets: [{ label: 'Unidades Vendidas (Presup.)', data: topProductsByQuantity.map(([, qty]) => qty), backgroundColor: '#198754' }] };

      setDashboardData({
        kpis: {
            totalIncome: manualIncome,
            totalSalesRevenue,
            totalExpense,
            balance,
            totalOrders,
            totalCustomers,
            totalInventoryValue,
            averageOrderValue,
            checksToCollect: checksToCollectThisMonth,
            // --- ▼▼▼ Añadimos los nuevos KPIs ▼▼▼ ---
            grossValueInProduction,
            netValueInProduction,
            // --- ▲▲▲ FIN AÑADIDOS ▲▲▲ ---
        },
        charts: {
          monthlyProductionIncomeChart,
          productionStatusChart: productionStatusChartData,
          topCustomersProductionChart,
          expenseChart,
          topProductsByQuantityChart
        },
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

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } let value = 0; if (context.parsed.y !== null) value = context.parsed.y; else if (context.parsed.x !== null) value = context.parsed.x; else if (context.parsed !== null) value = context.parsed; label += formatCurrency(value); return label; } } } } };
  const barChartOptions = { ...chartOptions, indexAxis: 'y', scales: { x: { beginAtZero: true } } };
  const verticalBarChartOptions = { ...chartOptions, scales: { y: { beginAtZero: true } } };

  return (
    <div className={styles.pageContent}>
      <div className={styles.pageHeader}>
        <h1>Dashboard Financiero DE Group</h1>
        <p className={styles.subtitle}>Gestión Financiera de la empresa.</p>
      </div>

      {loading ? <p>Cargando y calculando datos...</p> : dashboardData && (
        <>
          <div className={styles.kpiGrid}>
            <KPI title="Ingresos por Ventas" value={formatCurrency(dashboardData.kpis.totalSalesRevenue)} icon={<FaCashRegister />} color="#20c997" />
            <KPI title="Ingresos (Manuales)" value={formatCurrency(dashboardData.kpis.totalIncome)} icon={<FaDollarSign />} color="#198754" />
            <KPI title="Gastos Totales" value={formatCurrency(dashboardData.kpis.totalExpense)} icon={<FaRegChartBar />} color="#dc3545" />
            <KPI title="Balance" value={formatCurrency(dashboardData.kpis.balance)} icon={<FaBalanceScale />} color={dashboardData.kpis.balance >= 0 ? "#0d6efd" : "#dc3545"} />
            {/* --- ▼▼▼ Nuevos KPIs añadidos ▼▼▼ --- */}
            <KPI title="Valor Bruto en Prod." value={formatCurrency(dashboardData.kpis.grossValueInProduction)} icon={<FaIndustry />} color="#ffc107" />
            <KPI title="Valor Neto en Prod." value={formatCurrency(dashboardData.kpis.netValueInProduction)} icon={<FaTools />} color="#17a2b8" />
            {/* --- ▲▲▲ Fin Nuevos KPIs ▲▲▲ --- */}
            <KPI title="Cheques a Cobrar (Mes)" value={formatCurrency(dashboardData.kpis.checksToCollect)} icon={<FaFileInvoiceDollar />} color="#6f42c1" />
            <KPI title="Total de Órdenes" value={dashboardData.kpis.totalOrders} icon={<FaShoppingCart />} color="#0d6efd" />
            <KPI title="Ticket Promedio" value={formatCurrency(dashboardData.kpis.averageOrderValue)} icon={<FaChartPie />} color="#17a2b8" />
            <KPI title="Valor del Inventario" value={formatCurrency(dashboardData.kpis.totalInventoryValue)} icon={<FaWarehouse />} color="#fd7e14" />
            <KPI title="Clientes Registrados" value={dashboardData.kpis.totalCustomers} icon={<FaUsers />} color="#6f42c1" />
          </div>

          <div className={styles.mainChartsGrid}>
            <div className={styles.chartContainer}>
              <h3>Ingresos por Producción (Últimos 6 Meses)</h3>
              <div className={styles.chartWrapper}><Bar data={dashboardData.charts.monthlyProductionIncomeChart} options={verticalBarChartOptions} /></div>
            </div>
            <div className={styles.chartContainer}>
              <h3>Top 5 Clientes por Producción</h3>
              <div className={styles.chartWrapper}><Bar data={dashboardData.charts.topCustomersProductionChart} options={barChartOptions} /></div>
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
              <h3>Top 5 Productos (por Cantidad Presupuestada)</h3>
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