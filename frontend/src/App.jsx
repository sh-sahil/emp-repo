import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-800 flex flex-col">
        {isAuthenticated && <Navbar />}
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
            <Route
              path="/register"
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
            />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />}
            />
            <Route
              path="/upload-form16"
              element={isAuthenticated ? <Form16Upload /> : <Navigate to="/" />}
            />
            <Route
              path="/add-investments"
              element={isAuthenticated ? <AddInvestments /> : <Navigate to="/" />}
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
