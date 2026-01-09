import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './IndividualStockChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const IndividualStockChart = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // La lógica para filtrar y ordenar los datos se mantiene igual
  const chartData = useMemo(() => {
    let data = (Array.isArray(items) ? items : [])
      .map(item => ({ ...item, stock: parseFloat(item.stock) || 0 }));
    
    if (searchTerm.trim() !== '') {
      data = data.filter(item => 
        item.name && typeof item.name === 'string' && item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    data.sort((a, b) => b.stock - a.stock);
    
    const finalData = searchTerm.trim() === '' ? data.slice(0, 15) : data;

    return {
      labels: finalData.map(item => item.name.length > 30 ? `${item.name.substring(0, 30)}...` : item.name),
      datasets: [
        {
          label: 'Stock Actual',
          data: finalData.map(item => item.stock),
          backgroundColor: 'rgba(54, 162, 235, 0.6)', // Un azul más vibrante
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          borderRadius: 5, // <-- Bordes redondeados
          borderSkipped: false,
          hoverBackgroundColor: 'rgba(54, 162, 235, 1)', // <-- Color al pasar el mouse
        },
      ],
    };
  }, [items, searchTerm]);

  // --- OPCIONES DE DISEÑO MEJORADAS ---
  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { // <-- Animación
      duration: 1000,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        display: false, // Quitamos la leyenda de arriba para un look más limpio
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#343a40', // Tooltip oscuro
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
        callbacks: {
            label: function(context) {
                return `Stock: ${context.raw.toLocaleString()} unidades`;
            }
        }
      }
    },
    scales: {
        x: {
            grid: {
                color: '#e9ecef', // Líneas de la cuadrícula más sutiles
                borderColor: '#ced4da',
            },
            ticks: {
                beginAtZero: true,
                font: {
                    family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
                }
            }
        },
        y: {
            grid: {
                display: false, // Quitamos las líneas verticales para limpiar la vista
            },
            ticks: {
                 font: {
                    family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
                }
            }
        }
    }
  };

  return (
    <div className="individual-stock-container">
      <div className="chart-header">
        <h3 className="card-title">Stock por Pieza Individual</h3>
        <input 
          type="text"
          placeholder="Filtrar por nombre de pieza..."
          className="chart-filter-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="chart-wrapper" style={{ height: chartData.labels.length * 35 + 100, minHeight: '400px' }}>
        {chartData.labels.length > 0 ? (
          <Bar options={chartOptions} data={chartData} />
        ) : (
          <p>No se encontraron piezas.</p>
        )}
      </div>
    </div>
  );
};

export default IndividualStockChart;