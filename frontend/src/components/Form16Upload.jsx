import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Form16Upload = () => {
  const [file, setFile] = useState(null);
  const [taxDetails, setTaxDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const handleFileChange = event => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleDrag = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setFileName(e.dataTransfer.files[0].name);
    }
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
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-800">Upload Form 16</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-indigo-100">
        <div className="px-4 py-5 sm:p-6">
          <div className="max-w-xl">
            <p className="text-sm text-gray-500 mb-6">
              Upload your Form 16 PDF to extract tax details. This information will be used to
              analyze your tax situation and provide recommendations.
            </p>

            <div
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${
                dragActive ? "border-indigo-500 bg-indigo-50" : "border-indigo-300"
              } border-dashed rounded-md transition-all duration-200`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <svg
                  className={`mx-auto h-12 w-12 ${
                    dragActive ? "text-indigo-500" : "text-indigo-400"
                  }`}
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h-4v4h4v-4z" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
                {fileName && (
                  <p className="text-sm text-indigo-600 mt-2 font-medium">Selected: {fileName}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4 animate-pulse">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className={`inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-lg text-white ${
                  loading || !file
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105"
                } transition-all duration-300`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Upload & Extract"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {taxDetails && (
        <div className="mt-8 bg-white shadow-xl rounded-lg overflow-hidden border border-indigo-100">
          <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-indigo-50 to-blue-50">
            <h3 className="text-lg leading-6 font-medium text-indigo-800">Extracted Tax Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              The following information was extracted from your Form 16.
            </p>
          </div>
          <div className="border-t border-indigo-200">
            <dl>
              {Object.entries(taxDetails).map(([key, value], index) => (
                <div
                  key={key}
                  className={`${
                    index % 2 === 0 ? "bg-white" : "bg-indigo-50"
                  } px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 transition-colors duration-150 hover:bg-indigo-100`}
                >
                  <dt className="text-sm font-medium text-indigo-700">
                    {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-medium">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 text-right sm:px-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-lg text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Form16Upload;
