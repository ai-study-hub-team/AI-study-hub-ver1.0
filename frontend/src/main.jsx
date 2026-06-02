import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ConfigProvider } from 'antd';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#4f46e5', // Beautiful indigo primary
          borderRadius: 8,
          fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif",
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
