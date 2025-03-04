import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AddInvestments() {
  const [investmentType, setInvestmentType] = useState("");
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const investmentOptions = [
    { value: "property", label: "Property", route: "http://localhost:3000/add-property-details" },
    {
      value: "agriculture",
      label: "Agriculture/Business",
      route: "http://localhost:3000/add-agriculture-details",
    },
    {
      value: "capital_gains",
      label: "Capital Gains",
      route: "http://localhost:3000/add-capital-gains-details",
    },
    { value: "other", label: "Other", route: "http://localhost:3000/add-other-details" },
  ];

  const requiredFields = {
    property: ["rent_evolved", "tax_paid", "property_loan_interest"],
    agriculture: ["income_earned", "expenses_incurred"],
    capital_gains: ["shares", "equity_mutual_funds", "real_estate", "gold", "listed_bonds"],
    other: [
      "saving_bank_interest",
      "fd_interest",
      "dividend_report",
      "winning",
      "epp_acc",
      "other_income",
    ],
  };

  const handleInvestmentTypeChange = e => {
    setInvestmentType(e.target.value);
    setFormData({});
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: parseFloat(value) || 0 });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    try {
      const selectedOption = investmentOptions.find(opt => opt.value === investmentType);
      if (!selectedOption) throw new Error("Invalid investment type");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await axios.post(selectedOption.route, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("API Response:", response.data);
      alert("Investment details submitted successfully!");
      navigate("/dashboard"); // Redirect to dashboard on success
    } catch (err) {
      console.error("Error submitting form:", err);
      setError(err.message || "An error occurred while submitting the form.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6 animate-fade-in-down">
          Add Investments
        </h1>
        <nav>
          <ul className="space-y-2">
            {investmentOptions.map((option, index) => (
              <li key={index}>
                <button
                  onClick={() => setInvestmentType(option.value)}
                  className={`w-full text-left text-lg px-4 py-2 rounded-md transition-all duration-300 ease-in-out transform hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white hover:scale-105 cursor-pointer ${
                    investmentType === option.value
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : "text-gray-300"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-8">
        <header className="flex justify-between items-center mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-100">Add New Investment</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2 rounded-lg shadow-md hover:from-red-600 hover:to-red-700 transition duration-200 transform hover:scale-105 cursor-pointer"
          >
            Back to Dashboard
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-lg animate-fade-in-up"
        >
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300">Investment Type</label>
            <select
              value={investmentType}
              onChange={handleInvestmentTypeChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              <option value="" className="text-gray-400">
                Select an investment type
              </option>
              {investmentOptions.map(option => (
                <option key={option.value} value={option.value} className="text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {investmentType && (
            <div className="space-y-4">
              {requiredFields[investmentType].map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-300">
                    {field.replace(/_/g, " ").toUpperCase()}
                  </label>
                  <input
                    type="number"
                    name={field}
                    value={formData[field] || ""}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    required
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="mt-6 w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-md shadow-md hover:from-green-600 hover:to-green-700 transition duration-200 transform hover:scale-105 cursor-pointer"
          >
            Submit
          </button>
          {error && <p className="mt-4 text-red-400 text-center animate-fade-in">{error}</p>}
        </form>
      </main>

      {/* Custom CSS for Animations */}
      <style jsx global>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.5s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}

export default AddInvestments;
