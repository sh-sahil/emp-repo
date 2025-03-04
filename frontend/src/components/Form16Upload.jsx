import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Added for navigation consistency

const Form16Upload = () => {
  const [file, setFile] = useState(null);
  const [taxDetails, setTaxDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate(); // Added for navigation back to dashboard

  const handleFileChange = event => {
    setFile(event.target.files[0]);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get("http://localhost:3000/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProfile(response.data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setError("Failed to load profile.");
      }
    };
    fetchProfile();
  }, [token]);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }
    if (!profile) {
      setError("User profile not loaded. Please try again.");
      return;
    }
    if (!token) {
      setError("Authentication failed. Please log in again.");
      return;
    }

    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", profile._id);

    try {
      const response = await axios.post("http://localhost:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setTaxDetails(response.data.tax_details);
      navigate("/dashboard"); // Navigate back to dashboard on success
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError("Tax details already uploaded. Please wait for the previous upload to complete.");
      } else {
        setError("An error occurred while uploading the file. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Upload Form 16 PDF</h2>

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="mb-4 w-full p-2 border border-gray-600 rounded bg-gray-700 text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
        />

        <button
          onClick={handleUpload}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 transition duration-200 transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload & Extract"}
        </button>

        {error && <p className="text-center text-red-400 mt-4 animate-fade-in">{error}</p>}

        {taxDetails && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-white mb-2">Extracted Tax Details</h3>
            <div className="bg-gray-700 p-4 rounded-lg space-y-2">
              {Object.entries(taxDetails).map(([key, value]) => (
                <p key={key} className="border-b border-gray-600 py-1 text-gray-300">
                  <strong className="capitalize text-gray-100">{key.replace(/_/g, " ")}:</strong>{" "}
                  {value}
                </p>
              ))}
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 text-blue-400 hover:text-blue-500 transition duration-200 transform hover:scale-105 cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
      `}</style>
    </div>
  );
};

export default Form16Upload;
