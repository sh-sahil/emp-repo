// React Frontend (App.jsx)
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Form16Upload from "./components/Form16Upload";

function App() {
  const isAuthenticated = localStorage.getItem("token");

  // const [user, setUser] = useState(null);

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     const response = await fetch("/profile", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
  //     const data = await response.json();
  //     setUser(data);
  //   };

  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
