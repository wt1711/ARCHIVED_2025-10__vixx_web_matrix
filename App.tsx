import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import HomeTest from './src/screens/HomeTest';


export default function App() {

  return (
    <AuthProvider>
      <HomeTest />
    </AuthProvider>
  );
}