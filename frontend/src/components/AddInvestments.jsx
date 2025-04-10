import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AddInvestments() {
  const [investmentType, setInvestmentType] = useState("");
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);

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
      setError(
        err.response?.data?.message || err.message || "An error occurred while submitting the form."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-800">Add Investment</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-lg text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-indigo-100">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="investment-type"
                    className="block text-sm font-medium text-indigo-700"
                  >
                    Investment Type
                  </label>
                  <select
                    id="investment-type"
                    name="investment-type"
                    value={investmentType}
                    onChange={handleInvestmentTypeChange}
                    className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-indigo-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-indigo-50"
                    required
                  >
                    <option value="">Select an investment type</option>
                    {investmentOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {investmentType && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                      {requiredFields[investmentType].map(field => (
                        <div key={field}>
                          <label
                            htmlFor={field}
                            className="block text-sm font-medium text-indigo-700"
                          >
                            {field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-indigo-500 sm:text-sm">₹</span>
                            </div>
                            <input
                              type="number"
                              name={field}
                              id={field}
                              value={formData[field] || ""}
                              onChange={handleInputChange}
                              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-indigo-300 rounded-md py-3 bg-indigo-50"
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 p-4 animate-pulse">
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
                        <h3 className="text-sm font-medium text-red-800">{error}</h3>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard")}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!investmentType || isLoading}
                      className={`ml-3 inline-flex justify-center py-3 px-6 border border-transparent shadow-lg text-sm font-medium rounded-md text-white ${
                        !investmentType || isLoading
                          ? "bg-indigo-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105"
                      } transition-all duration-300`}
                    >
                      {isLoading ? (
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
                          Submitting...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-indigo-100">
            <div className="px-4 py-5 sm:p-6 bg-gradient-to-r from-indigo-50 to-blue-50">
              <h3 className="text-lg leading-6 font-medium text-indigo-800">
                Investment Types Explained
              </h3>
              <div className="mt-5 border-t border-indigo-200">
                <dl className="divide-y divide-indigo-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 hover:bg-indigo-50 transition-colors duration-200">
                    <dt className="text-sm font-medium text-indigo-700">Property</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Income from house property, including rental income, property tax paid, and
                      home loan interest.
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 hover:bg-indigo-50 transition-colors duration-200">
                    <dt className="text-sm font-medium text-indigo-700">Agriculture/Business</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Income from agricultural activities or business operations, including revenue
                      and expenses.
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 hover:bg-indigo-50 transition-colors duration-200">
                    <dt className="text-sm font-medium text-indigo-700">Capital Gains</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Profits from the sale of investments such as shares, mutual funds, real
                      estate, gold, and bonds.
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 hover:bg-indigo-50 transition-colors duration-200">
                    <dt className="text-sm font-medium text-indigo-700">Other</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Additional income sources including savings account interest, fixed deposit
                      interest, dividends, lottery winnings, and other miscellaneous income.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl rounded-lg overflow-hidden transform transition-all duration-300 hover:shadow-2xl">
            <div className="px-6 py-8 sm:p-10 text-white">
              <h3 className="text-xl font-bold">Tax Benefits</h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-indigo-200"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-indigo-100">
                      Property loan interest up to ₹2,00,000 can be claimed as deduction under
                      Section 24.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-indigo-200"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-indigo-100">
                      Long-term capital gains from equity investments are taxed at 10% above
                      ₹1,00,000.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-indigo-200"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-indigo-100">
                      Agricultural income is generally exempt from income tax in India.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-indigo-200"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-indigo-100">
                      Interest earned on savings accounts up to ₹10,000 is exempt under Section
                      80TTA.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddInvestments;
