import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Paleta de colores moderna
const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884d8', '#FF6B6B'];

// Tooltip flotante moderno
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '12px 16px',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        backdropFilter: 'blur(8px)'
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#2d3748' }}>{payload[0].name}</p>
        <p style={{ margin: 0, color: payload[0].payload.fill, fontWeight: '600' }}>
          Stock: {payload[0].value.toLocaleString()} un.
        </p>
      </div>
    );
  }
  return null;
};

const CategoryStockChart = ({ items }) => {
  const safeItems = Array.isArray(items) ? items : [];

  const dataByCategory = safeItems.reduce((acc, item) => {
    // Tomamos category o type, según cómo venga en tu BD
    const category = item.category || item.type || 'Sin Categoría';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += (parseFloat(item.stock) || 0);
    return acc;
  }, {});

  const chartData = Object.keys(dataByCategory)
    .map(categoryName => ({
        name: categoryName,
        value: dataByCategory[categoryName],
    }))
    .filter(entry => entry.value > 0);

  if (chartData.length === 0) {
    return <p style={{textAlign: 'center', paddingTop: '2rem', color: '#718096'}}>No hay stock para mostrar por categoría.</p>;
  }

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <PieChart>
          {/* DEFINICIONES PARA EL EFECTO 3D Y GRADIENTES */}
          <defs>
            <filter id="shadow3d-category" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="6" stdDeviation="5" floodOpacity="0.3" />
            </filter>
            {COLORS.map((color, index) => (
              <linearGradient key={`grad-cat-${index}`} id={`grad-cat-${index}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>

          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
            stroke="none"
            filter="url(#shadow3d-category)" // Aplica la sombra 3D
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#grad-cat-${index % COLORS.length})`} // Aplica el gradiente
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle" 
            wrapperStyle={{ fontWeight: 500, fontSize: '0.85rem' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryStockChart;