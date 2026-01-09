import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FinishedGoodsChart = ({ recipes }) => {
  const dataForChart = (Array.isArray(recipes) ? recipes : [])
    .map(recipe => ({ ...recipe, stockFinished: parseFloat(recipe.stockFinished) || 0 }))
    .filter(recipe => recipe.stockFinished > 0)
    .sort((a, b) => b.stockFinished - a.stockFinished);

  if (dataForChart.length === 0) {
    return <p>No hay equipos terminados en stock.</p>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={dataForChart} margin={{ top: 5, right: 30, left: 100, bottom: 5, }}>
          <XAxis type="number" domain={[0, 'dataMax + 5']} />
          <YAxis dataKey="productName" type="category" width={150} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => `${value.toLocaleString()} unidades`}/>
          <Legend />
          <Bar dataKey="stockFinished" name="Stock Terminado" fill="#28a745" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinishedGoodsChart;