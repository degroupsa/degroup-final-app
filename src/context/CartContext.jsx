import React, { createContext, useState, useEffect, useContext } from 'react';

export const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const localCart = localStorage.getItem('cart');
      return localCart ? JSON.parse(localCart) : [];
    } catch (error) {
      console.error("Error al leer el carrito del localStorage", error);
      return [];
    }
  });

  // Nuevo estado para el método de pago
  const [paymentMethod, setPaymentMethod] = useState('MercadoPago');

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error("Error al guardar el carrito en localStorage", error);
    }
  }, [cart]);

  const addItem = (item, quantity) => {
    if (isInCart(item.id)) {
      setCart(cart.map(product =>
        product.id === item.id
          ? { ...product, quantity: product.quantity + quantity }
          : product
      ));
    } else {
      setCart([...cart, { ...item, quantity }]);
    }
  };

  const removeItem = (itemId) => {
    setCart(cart.filter(product => product.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const isInCart = (itemId) => {
    return cart.some(product => product.id === itemId);
  };

  const getTotalQuantity = () => {
    return cart.reduce((total, product) => total + product.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, product) => total + (product.price * product.quantity), 0);
  };

  const contextValue = {
    items: cart,
    addItem,
    removeItem,
    clearCart,
    getTotalQuantity,
    getTotalPrice,
    paymentMethod,
    setPaymentMethod,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};