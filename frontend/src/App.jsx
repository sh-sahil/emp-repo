import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Form16Upload from "./components/Form16Upload";
import Navbar from "./components/Navbar";
import AddInvestments from "./components/AddInvestments";
function App() {
  const isAuthenticated = localStorage.getItem("token");

  return (
    <BrowserRouter>
      {isAuthenticated && <Navbar />} {/* Show Navbar only if authenticated */}
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
        />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />} />
        <Route
          path="/upload-form16"
          element={isAuthenticated ? <Form16Upload /> : <Navigate to="/" />}
        />
        <Route
          path="/add-investments"
          element={isAuthenticated ? <AddInvestments /> : <Navigate to="/" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
