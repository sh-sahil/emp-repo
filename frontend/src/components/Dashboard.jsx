import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

async function getStreamedResponse(prompt) {
  console.log("Prompt sent to backend:", prompt);
  const response = await fetch("http://127.0.0.1:8000/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    result += chunk;
  }

  console.log("Raw response from backend:", result);
  return result;
}

const parseTaxText = text => {
  const lines = text.split("\n").filter(line => line.trim().length > 0);

  return lines.map((line, index) => {
    line = line.replace(/```/g, "").trim();

    const parts = line.split(/(\*\*[^\*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-gray-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (line.startsWith("# ")) {
      return (
        <h2 key={index} className="text-xl font-bold text-white mt-4 mb-2">
          {line.replace(/^#\s*/, "")}
        </h2>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={index} className="text-lg font-semibold text-white mt-3 mb-2">
          {line.replace(/^##\s*/, "")}
        </h3>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h4 key={index} className="text-md font-semibold text-white mt-2 mb-1">
          {line.replace(/^###\s*/, "")}
        </h4>
      );
    }

    if (line.match(/^\s*[-*]\s+/)) {
      return (
        <li key={index} className="text-gray-300 ml-6 list-disc">
          {line.replace(/^\s*[-*]\s+/, "")}
        </li>
      );
    }

    return (
      <p key={index} className="text-gray-300 mb-2">
        {parts}
      </p>
    );
  });
};

function Dashboard() {
  const [form16Data, setForm16Data] = useState(null);
  const [investments, setInvestments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [taxComparisonText, setTaxComparisonText] = useState(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No token found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get("http://localhost:3000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(response.data);

        const form16Response = await axios.get("http://localhost:3000/form16", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Form 16 Data:", form16Response.data);
        setForm16Data(form16Response.data);

        const investmentTypes = ["property", "agriculture", "capital-gains", "other"];
        const investmentData = {};

        for (const type of investmentTypes) {
          const response = await axios.get(`http://localhost:3000/${type}-details`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          investmentData[type] = response.data;
          console.log(`${type} Investment Data:`, response.data);
        }
        setInvestments(investmentData);
        console.log("All Investments:", investmentData);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const fetchTaxComparison = async () => {
    setTaxLoading(true);
    try {
      const prompt = `
      You are a Tax Advisor in India, You suggest which tax regeme id best for a Particular person to save maximum tax.
      Based on my financial details:

      Make sure you respond in 2000 words or less.

      Gross Salary: ${JSON.stringify(form16Data || {})}
      Total Investments: ${JSON.stringify(investments || {})}

      Breakdown of my current investments:

      Property: ${JSON.stringify(investments.property || {})}
      Agriculture: ${JSON.stringify(investments.agriculture || {})}
      Capital Gains: ${JSON.stringify(investments["capital-gains"] || {})}
      Other: ${JSON.stringify(investments.other || {})}
      
      use the above information, suggest in Indian OLD Tax Regeme - 2023-24 and New Tax Regeme - 2024-25, How much tax I can save by investing in various tax saving options?

      In the end I want you to give me One Tax Regeme I should follow to save maximum tax.
    `;

      const taxData = await getStreamedResponse(prompt);
      setTaxComparisonText(taxData);

      if (!profile || !profile._id) {
        throw new Error("User profile not loaded");
      }

      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("response", taxData);
      formData.append("userId", profile._id);

      const saveResponse = await axios.post("http://127.0.0.1:8000/save-response", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Response saved:", saveResponse.data);
    } catch (err) {
      setError(err.message || "Error fetching or saving tax comparison");
      console.error("Error:", err);
    } finally {
      setTaxLoading(false);
    }
  };

  const fetchStoredTaxComparison = async () => {
    setTaxLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found. Please log in.");
      }

      const response = await axios.get("http://localhost:3000/tax-comparison", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const storedTaxData = response.data.response;
      setTaxComparisonText(storedTaxData);
      console.log("Stored tax comparison fetched:", storedTaxData);
    } catch (err) {
      setError(err.message || "Error fetching stored tax comparison");
      console.error("Error fetching stored tax comparison:", err);
    } finally {
      setTaxLoading(false);
    }
  };

  const investmentFields = {
    property: ["rent_evolved", "tax_paid", "property_loan_interest"],
    agriculture: ["income_earned", "expenses_incurred"],
    "capital-gains": ["shares", "equity_mutual_funds", "real_estate", "gold", "listed_bonds"],
    other: [
      "saving_bank_interest",
      "fd_interest",
      "dividend_report",
      "winning",
      "epp_acc",
      "other_income",
    ],
  };

  const investmentPairs = [
    {
      title: "My Form 16",
      data: form16Data,
      fields: [
        "assessment_year",
        "gross_salary",
        "standard_deduction",
        "section_80C",
        "section_80D",
      ],
    },
    {
      title: "My Property Investments",
      data: investments.property,
      fields: investmentFields.property,
    },
    {
      title: "My Agriculture Investments",
      data: investments.agriculture,
      fields: investmentFields.agriculture,
    },
    {
      title: "My Capital Gains Investments",
      data: investments["capital-gains"],
      fields: investmentFields["capital-gains"],
    },
    { title: "My Other Investments", data: investments.other, fields: investmentFields.other },
  ];

  const totalInvestments = [
    investments.property
      ? Object.values(investments.property).reduce((sum, val) => sum + (Number(val) || 0), 0)
      : 0,
    investments.agriculture
      ? Object.values(investments.agriculture).reduce((sum, val) => sum + (Number(val) || 0), 0)
      : 0,
    investments["capital-gains"]
      ? Object.values(investments["capital-gains"]).reduce(
          (sum, val) => sum + (Number(val) || 0),
          0
        )
      : 0,
    investments.other
      ? Object.values(investments.other).reduce((sum, val) => sum + (Number(val) || 0), 0)
      : 0,
  ].reduce((sum, val) => sum + val, 0);

  const summaryChartData = {
    labels: ["Property", "Agriculture", "Capital Gains", "Other"],
    datasets: [
      {
        label: "Investment Value",
        data: [
          investments.property
            ? Object.values(investments.property).reduce((sum, val) => sum + (Number(val) || 0), 0)
            : 0,
          investments.agriculture
            ? Object.values(investments.agriculture).reduce(
                (sum, val) => sum + (Number(val) || 0),
                0
              )
            : 0,
          investments["capital-gains"]
            ? Object.values(investments["capital-gains"]).reduce(
                (sum, val) => sum + (Number(val) || 0),
                0
              )
            : 0,
          investments.other
            ? Object.values(investments.other).reduce((sum, val) => sum + (Number(val) || 0), 0)
            : 0,
        ],
        backgroundColor: ["#38b2ac", "#ed8936", "#805ad5", "#9f7aea"],
        borderColor: ["#2c7a7b", "#c05621", "#553c9a", "#6b46c1"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top", labels: { color: "white" } },
      title: { display: true, color: "white", font: { size: 18 } },
    },
    scales: {
      x: { ticks: { color: "white" } },
      y: { ticks: { color: "white" }, beginAtZero: true },
    },
  };

  const getSectionChartData = (data, fields, title) => ({
    labels: fields.map(field => field.replace(/_/g, " ").toUpperCase()),
    datasets: [
      {
        label: `${title} Breakdown`,
        data: fields.map(field => Number(data?.[field]) || 0),
        backgroundColor: "#38b2ac",
        borderColor: "#2c7a7b",
        borderWidth: 1,
      },
    ],
  });

  const renderBox = (title, data, fields) => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300 w-full">
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        {data && Object.keys(data).length > 0 ? (
          <div className="space-y-2">
            {fields.map(field =>
              data[field] !== undefined && data[field] !== null ? (
                <p key={field} className="text-sm text-gray-300">
                  <strong className="text-gray-100">
                    {field.replace(/_/g, " ").toUpperCase()}:
                  </strong>{" "}
                  {data[field]}
                </p>
              ) : null
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">No data available</p>
            {title === "My Form 16" && (
              <button
                onClick={() => navigate("/upload-form16")}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-md shadow-md hover:from-green-600 hover:to-green-700 transition duration-200 transform hover:scale-105 cursor-pointer"
              >
                Upload Form 16
              </button>
            )}
          </div>
        )}
      </div>
      {data && Object.keys(data).length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <Bar
            data={getSectionChartData(data, fields, title)}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: { ...chartOptions.plugins.title, text: `${title} Breakdown` },
              },
            }}
          />
        </div>
      )}
    </div>
  );

  const handleMenuClick = section => setSelectedSection(section);

  const renderTaxComparison = () => {
    if (!taxComparisonText) return null;

    let rawText;
    try {
      const parsedJson = JSON.parse(taxComparisonText);
      rawText = parsedJson.response || taxComparisonText;
    } catch (err) {
      rawText = taxComparisonText;
    }

    const formattedText = parseTaxText(rawText);

    return (
      <div className="mt-8 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300">
        <h3 className="text-xl font-semibold text-white mb-4">Tax Saving Analysis</h3>
        <div className="text-gray-300 space-y-4">{formattedText}</div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white">
      <aside className="w-64 bg-gray-800 p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6 animate-fade-in-down">
          Dashboard
        </h1>
        <nav>
          <ul className="space-y-2">
            {investmentPairs.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() => handleMenuClick(item.title)}
                  className={`w-full text-left text-lg px-4 py-2 rounded-md transition-all duration-300 ease-in-out transform hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white hover:scale-105 cursor-pointer ${
                    selectedSection === item.title
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : "text-gray-300"
                  }`}
                >
                  {item.title}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => navigate("/add-investments")}
                className="w-full text-left text-lg px-4 py-2 rounded-md transition-all duration-300 ease-in-out transform hover:bg-gradient-to-r hover:from-green-500 hover:to-teal-500 hover:text-white hover:scale-105 cursor-pointer text-gray-300"
              >
                Add New Investment
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="flex-grow p-8">
        <header className="flex justify-between items-center mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-100">Your Financial Dashboard</h2>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/");
              window.location.reload();
            }}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2 rounded-lg shadow-md hover:from-red-600 hover:to-red-700 transition duration-200 transform hover:scale-105 cursor-pointer"
          >
            Logout
          </button>
        </header>

        {loading && <p className="text-center text-gray-400 animate-pulse">Loading...</p>}
        {error && <p className="text-center text-red-400 animate-fade-in">{error}</p>}

        {!loading && !error && (
          <div className="space-y-12 animate-fade-in-up">
            {!selectedSection ? (
              <div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 transform transition-all duration-500 ease-in-out hover:scale-102">
                  <h3 className="text-2xl font-bold text-gray-100 mb-4">Total Investments</h3>
                  <p className="text-xl text-gray-300">₹{totalInvestments.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out hover:scale-102">
                  <Bar
                    data={summaryChartData}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        title: { ...chartOptions.plugins.title, text: "Investment Distribution" },
                      },
                    }}
                  />
                </div>
                <div className="mt-6 space-x-4">
                  <button
                    onClick={fetchTaxComparison}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 transition duration-200 transform hover:scale-105 cursor-pointer"
                    disabled={taxLoading}
                  >
                    {taxLoading ? "Fetching Tax Options..." : "Get Tax Saving Options"}
                  </button>
                  <button
                    onClick={fetchStoredTaxComparison}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-md hover:from-purple-600 hover:to-purple-700 transition duration-200 transform hover:scale-105 cursor-pointer"
                    disabled={taxLoading}
                  >
                    {taxLoading ? "Fetching Stored Options..." : "Load Stored Tax Options"}
                  </button>
                </div>
                {taxLoading && (
                  <p className="text-center text-gray-400 animate-pulse mt-4">
                    Loading tax options...
                  </p>
                )}
                {renderTaxComparison()}
              </div>
            ) : (
              <div>
                {investmentPairs
                  .filter(item => item.title === selectedSection)
                  .map((item, index) => (
                    <div key={index}>{renderBox(item.title, item.data, item.fields)}</div>
                  ))}
                <button
                  onClick={() => setSelectedSection(null)}
                  className="mt-4 text-blue-400 hover:text-blue-500 transition duration-200 transform hover:scale-105 cursor-pointer"
                >
                  Back to Summary
                </button>
              </div>
            )}

            <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-102">
              <h2 className="text-xl font-semibold text-white mb-2">Investments</h2>
              <p className="text-teal-100 mb-4">
                Add more investments to optimize your tax savings.
              </p>
              <button
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-md shadow-md hover:from-green-600 hover:to-green-700 transition duration-200 transform hover:scale-105 cursor-pointer"
                onClick={() => navigate("/add-investments")}
              >
                Add Investments
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-down { animation: fadeInDown 0.5s ease-out; }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        .animate-pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .hover\\:scale-102:hover { transform: scale(1.02); }
      `}</style>
    </div>
  );
}

export default Dashboard;
