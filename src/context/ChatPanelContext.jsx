import React, { createContext, useState, useContext } from 'react';

// 1. Creamos el contexto
const ChatPanelContext = createContext();

// 2. Creamos un "hook" personalizado para usar el contexto fácilmente
export const useChatPanel = () => {
  return useContext(ChatPanelContext);
};

// 3. Creamos el Proveedor del contexto
export const ChatPanelProvider = ({ children }) => {
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);

  const toggleChatPanel = () => {
    setIsChatPanelOpen(prev => !prev);
  };

  const value = {
    isChatPanelOpen,
    toggleChatPanel,
  };

  return (
    <ChatPanelContext.Provider value={value}>
      {children}
    </ChatPanelContext.Provider>
  );
};