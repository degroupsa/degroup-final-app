import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

const CategoryStockChart = ({ items }) => {
  // Usamos un array vacío por defecto si 'items' no es un array
  const safeItems = Array.isArray(items) ? items : [];

  const dataByCategory = safeItems.reduce((acc, item) => {
    const category = item.type || 'Sin Categoría';
    if (!acc[category]) {
      acc[category] = 0;
    }
    // La conversión a número para máxima seguridad
    acc[category] += (parseFloat(item.stock) || 0);
    return acc;
  }, {});

  const chartData = Object.keys(dataByCategory)
    .map(categoryName => ({
        name: categoryName,
        value: dataByCategory[categoryName],
    }))
    .filter(entry => entry.value > 0); // Solo mostramos categorías con stock

  if (chartData.length === 0) {
    return <p style={{textAlign: 'center', paddingTop: '2rem'}}>No hay stock para mostrar por categoría.</p>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value.toLocaleString()} unidades`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryStockChart;