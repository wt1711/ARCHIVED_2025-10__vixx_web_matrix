import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import Home from './src/screens/Home';


export default function App() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
}