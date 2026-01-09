import React from 'react';
import { db } from '../../../firebase/config';
import { doc, runTransaction, collection, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import './InventoryTables.css';

// 1. AÑADIMOS 'products' a las props que recibe el componente
const FinishedGoodsTable = ({ recipes, products, onActionComplete }) => {
    
  const handleDeliver = async (recipe) => {
    const stockActual = recipe.stockFinished || 0;
    const quantityToDeliver = parseInt(prompt(`¿Cuántas unidades de "${recipe.productName}" quieres entregar?\nStock actual: ${stockActual}`), 10);

    if (isNaN(quantityToDeliver) || quantityToDeliver <= 0) {
      if (!isNaN(quantityToDeliver)) toast.error("Por favor, ingresa una cantidad válida.");
      return;
    }

    if (quantityToDeliver > stockActual) {
      toast.error("No puedes entregar más unidades de las que tienes en stock.");
      return;
    }
    
    toast.loading("Procesando entrega...");

    try {
        const recipeRef = doc(db, 'productRecipes', recipe.id);
        
        // 2. Usamos la lista de 'products' que ahora recibe el componente
        const productInfo = products.find(p => p.name === recipe.productName);

        if (!productInfo) {
            throw new Error(`No se encontró la información del producto "${recipe.productName}" para registrar el precio.`);
        }

        await runTransaction(db, async (transaction) => {
            const recipeDoc = await transaction.get(recipeRef);
            if (!recipeDoc.exists()) throw new Error("La receta de este equipo ya no existe.");

            const newStock = (recipeDoc.data().stockFinished || 0) - quantityToDeliver;
            transaction.update(recipeRef, { stockFinished: newStock });
            
            const incomeRecordRef = doc(collection(db, 'registrosFinancieros'));
            const incomeAmount = (productInfo.price || 0) * quantityToDeliver;
            transaction.set(incomeRecordRef, {
                amount: incomeAmount,
                concept: `Venta de ${quantityToDeliver} x "${recipe.productName}"`,
                date: Timestamp.now(),
                type: 'ingreso'
            });
        });

        toast.dismiss();
        toast.success("¡Entrega e ingreso registrados con éxito!");
        onActionComplete();

    } catch (error) {
        toast.dismiss();
        toast.error("Error al registrar la entrega: " + error.message);
        console.error(error);
    }
  };

  const sortedRecipes = (Array.isArray(recipes) ? recipes : []).sort((a, b) => a.productName.localeCompare(b.productName));

  return (
    <div className="table-container">
      <h3 className="table-title">Stock de Equipos Terminados</h3>
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Nombre del Equipo</th>
            <th>SKU</th>
            <th>Stock Disponible</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedRecipes.map(recipe => {
            const stockFinished = recipe.stockFinished || 0;
            return (
                <tr key={recipe.id}>
                <td>{recipe.productName}</td>
                <td>{recipe.productSKU || 'N/A'}</td>
                <td><strong>{stockFinished}</strong></td>
                <td>
                    <button 
                      className="action-btn deliver" 
                      onClick={() => handleDeliver(recipe)}
                      disabled={!stockFinished || stockFinished === 0}
                    >
                      Entregar
                    </button>
                </td>
                </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FinishedGoodsTable;