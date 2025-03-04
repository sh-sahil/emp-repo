import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        navigate("/");
        window.location.reload();
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    navigate("/");
    window.location.reload();
  };

  return (
    <nav className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 p-6 text-white shadow-lg">
      <div className="container mx-auto flex justify-between items-center animate-fade-in">
        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Employee Tax Assistant
        </div>
        <div className="flex items-center space-x-6">
          {user && (
            <span className="text-xl text-gray-200">
              Welcome, <span className="font-semibold text-white">{user.name.toUpperCase()}</span>
            </span>
          )}
        </div>
      </div>

      {/* Custom CSS for Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </nav>
  );
}

export default Navbar;
