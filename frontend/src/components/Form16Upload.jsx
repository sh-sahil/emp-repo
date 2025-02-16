import { useEffect, useState } from "react";
import axios from "axios";

const Form16Upload = () => {
  const [file, setFile] = useState(null);
  const [taxDetails, setTaxDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const token = localStorage.getItem("token");

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
    } catch (err) {
      if (err.response.status === 400) {
        setError("Tax details already uploaded. Please wait for the previous upload to complete.");
      } else {
        setError("An error occurred while uploading the file. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Upload Form 16 PDF</h2>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="mb-4 w-full p-2 border rounded"
      />
      <button
        onClick={handleUpload}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? "Uploading..." : "Upload & Extract"}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {taxDetails && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">Extracted Tax Details</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            {Object.entries(taxDetails).map(([key, value]) => (
              <p key={key} className="border-b py-1">
                <strong className="capitalize">{key.replace(/_/g, " ")}:</strong> {value}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Form16Upload;
