import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bar, Pie, Doughnut, Line, PolarArea, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
);

async function getStreamedResponse(prompt) {
  if (!prompt || typeof prompt !== "string") {
    console.error("Invalid prompt:", prompt);
    throw new Error("Prompt must be a non-empty string");
  }

  console.log("Prompt sent to backend:", prompt);
  const response = await fetch("http://127.0.0.1:8000/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fetch error:", errorText);
    throw new Error(`Fetch failed: ${errorText}`);
  }

  console.log(response);

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
  try {
    const parsedResult = JSON.parse(result);
    return parsedResult.response; // Extract the "response" field
  } catch (err) {
    console.error("Failed to parse response as JSON:", result);
    return result; // Fallback to raw text if JSON parsing fails
  }
}

const parseTaxText = text => {
  const lines = text.split("\n").filter(line => line.trim().length > 0);

  return lines.map((line, index) => {
    line = line.replace(/```/g, "").trim();

    const parts = line.split(/(\*\*[^\*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-indigo-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (line.startsWith("# ")) {
      return (
        <h2 key={index} className="text-xl font-bold text-indigo-900 mt-4 mb-2">
          {line.replace(/^#\s*/, "")}
        </h2>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={index} className="text-lg font-semibold text-indigo-800 mt-3 mb-2">
          {line.replace(/^##\s*/, "")}
        </h3>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h4 key={index} className="text-md font-semibold text-indigo-700 mt-2 mb-1">
          {line.replace(/^###\s*/, "")}
        </h4>
      );
    }

    if (line.match(/^\s*[-*]\s+/)) {
      return (
        <li key={index} className="text-gray-700 ml-6 list-disc">
          {line.replace(/^\s*[-*]\s+/, "")}
        </li>
      );
    }

    return (
      <p key={index} className="text-gray-700 mb-2">
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
      You are a Tax Advisor in India. Your task is to analyze my financial details and suggest which tax regime (Old Tax Regime 2023-24 or New Tax Regime 2024-25) allows me to save the maximum tax. Use the following financial details:

      Gross Salary: ${JSON.stringify(form16Data || {})}
      Total Investments: ${JSON.stringify(investments || {})}

      Breakdown of my current investments:
      - Property: ${JSON.stringify(investments.property || {})}
      - Agriculture: ${JSON.stringify(investments.agriculture || {})}
      - Capital Gains: ${JSON.stringify(investments["capital-gains"] || {})}
      - Other: ${JSON.stringify(investments.other || {})}

      Based on this information, calculate the tax liability under:
      - **Old Tax Regime (2023-24)**: Include applicable deductions (e.g., Standard Deduction, Section 80C) and tax rates.
      - **New Tax Regime (2024-25)**: Apply the updated tax slabs with no deductions except where applicable.

     **IMPORTANT**  NOTE: Provide your response in the following JSON format only/-- (fill in all values as strings, use "N/A" if not applicable, and ensure calculations are accurate):
      {
        "Old_Tax_Regime_2023_24": {
          "Income_from_Property": {
            "Amount": "<amount>",
            "Tax_Rate": "<tax_rate>",
            "Tax_Amount": "<tax_amount>"
          },
          "Agricultural_Income": {
            "Amount": "<amount>",
            "Tax_Rate": "<tax_rate>",
            "Tax_Amount": "<tax_amount>"
          },
          "Capital_Gains": {
            "Breakdown": {
              "Shares": "<amount>",
              "Equity_Mutual_Funds": "<amount>",
              "Real_Estate": "<amount>",
              "Gold": "<amount>"
            },
            "Total": "<total_amount>",
            "Tax_Rate": "<tax_rate>",
            "Tax_Amount": "<tax_amount>"
          },
          "Other_Income": {
            "Amount": "<amount>",
            "Tax_Amount": "<tax_amount>"
          },
          "Deductions": {
            "Standard_Deduction": "<amount>",
            "Section_80C": "<amount>",
            "Total_Deductions": "<total_amount>"
          },
          "Net_Taxable_Income": "<net_taxable_income>",
          "Additional_Tax_Rate": "<additional_rate>",
          "Total_Tax": "<total_tax>"
        },
        "New_Tax_Regime_2024_25": {
          "Income_from_Property": {
            "Amount": "<amount>",
            "Tax_Rate": "<tax_rate>",
            "Tax_Amount": "<tax_amount>"
          },
          "Agricultural_Income": {
            "Amount": "<amount>",
            "Tax_Rate": "<tax_rate>",
            "Tax_Amount": "<tax_amount>"
          },
          "Capital_Gains": {
            "Breakdown": {
              "Shares": "<amount>",
              "Equity_Mutual_Funds": "<amount>",
              "Real_Estate": "<amount>",
              "Gold": "<amount>"
            },
            "Total": "<total_amount>",
            "Tax_Rate": "<tax_rate>",
            "Tax_Amount": "<tax_amount>"
          },
          "Other_Income": {
            "Amount": "<amount>",
            "Tax_Amount": "<tax_amount>"
          },
          "Deductions": {
            "Standard_Deduction": "<amount>",
            "Section_80C": "<amount>",
            "Total_Deductions": "<total_amount>"
          },
          "Net_Taxable_Income": "<net_taxable_income>",
          "Additional_Tax_Rate": "<additional_rate>",
          "Total_Tax": "<total_tax>"
        },
        "Comparison": {
          "Old_Regime_Total_Tax": "<old_total_tax>",
          "New_Regime_Total_Tax": "<new_total_tax>",
          "Tax_Saving": "<tax_saving_amount>",
          "Recommended_Regime": "<Old Tax Regime 2023-24 or New Tax Regime 2024-25>"
        }
      }

      Ensure the response is concise (under 2000 words), accurate ONLY IN JSON FORMAT GIVEN, Final amounts in both of the calculations should not be the same, includes all calculations. Use Indian tax rules and slabs for 2023-24 (Old) and 2024-25 (New).
    `;

      const taxData = await getStreamedResponse(prompt);
      console.log("Tax data received:", taxData); // Debug the received tax data

      // Ensure taxData is a string; if it's an object, stringify it
      const taxDataString = typeof taxData === "string" ? taxData : JSON.stringify(taxData);
      setTaxComparisonText(taxDataString);

      if (!profile || !profile._id) {
        throw new Error("User profile not loaded or missing _id");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const payload = {
        response: taxDataString, // Use the stringified tax data
        userId: profile._id.toString(),
      };
      console.log("Payload sent to /save-response:", payload); // Debug the payload

      const saveResponse = await axios.post("http://127.0.0.1:8000/save-response", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Response saved:", saveResponse.data);
    } catch (err) {
      setError(err.message || "Error fetching or saving tax comparison");
      console.error("Error:", err);
      if (err.response) {
        console.error("Server error response:", err.response.data); // Log server error details
      }
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
      console.log("Stored tax data received:", storedTaxData); // Debug the received data

      // Ensure storedTaxData is a string; if it's an object, stringify it
      const storedTaxDataString =
        typeof storedTaxData === "string" ? storedTaxData : JSON.stringify(storedTaxData);
      setTaxComparisonText(storedTaxDataString);
      console.log("Stored tax comparison fetched:", storedTaxDataString);
    } catch (err) {
      setError(err.message || "Error fetching stored tax comparison");
      console.error("Error fetching stored tax comparison:", err);
      if (err.response) {
        console.error("Server error response:", err.response.data); // Log server error details
      }
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
      icon: "document-text",
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
      icon: "home",
      data: investments.property,
      fields: investmentFields.property,
    },
    {
      title: "My Agriculture Investments",
      icon: "globe",
      data: investments.agriculture,
      fields: investmentFields.agriculture,
    },
    {
      title: "My Capital Gains Investments",
      icon: "chart-bar",
      data: investments["capital-gains"],
      fields: investmentFields["capital-gains"],
    },
    {
      title: "My Other Investments",
      icon: "currency-dollar",
      data: investments.other,
      fields: investmentFields.other,
    },
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
        backgroundColor: ["#4F46E5", "#10B981", "#8B5CF6", "#F59E0B"],
        borderColor: ["#4338CA", "#059669", "#7C3AED", "#D97706"],
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: ["Property", "Agriculture", "Capital Gains", "Other"],
    datasets: [
      {
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
        backgroundColor: ["#4F46E5", "#10B981", "#8B5CF6", "#F59E0B"],
        borderColor: ["#ffffff"],
        borderWidth: 2,
      },
    ],
  };

  const radarChartData = {
    labels: ["Property", "Agriculture", "Capital Gains", "Other"],
    datasets: [
      {
        label: "Investment Distribution",
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
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        borderColor: "#4F46E5",
        borderWidth: 2,
        pointBackgroundColor: "#4F46E5",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#4F46E5",
      },
    ],
  };

  // Monthly investment trend (simulated data)
  const lineChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        label: "Investment Growth",
        data: [
          totalInvestments * 0.7,
          totalInvestments * 0.75,
          totalInvestments * 0.8,
          totalInvestments * 0.82,
          totalInvestments * 0.85,
          totalInvestments * 0.88,
          totalInvestments * 0.9,
          totalInvestments * 0.92,
          totalInvestments * 0.95,
          totalInvestments * 0.97,
          totalInvestments * 0.99,
          totalInvestments,
        ],
        fill: true,
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        borderColor: "#4F46E5",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, font: { size: 16 } },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right" },
      title: { display: true, font: { size: 16 } },
    },
  };

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          display: true,
          color: "rgba(0, 0, 0, 0.1)",
        },
        suggestedMin: 0,
      },
    },
  };

  const getSectionChartData = (data, fields, title) => ({
    labels: fields.map(field => field.replace(/_/g, " ").toUpperCase()),
    datasets: [
      {
        label: `${title} Breakdown`,
        data: fields.map(field => Number(data?.[field]) || 0),
        backgroundColor: [
          "#4F46E5",
          "#10B981",
          "#8B5CF6",
          "#F59E0B",
          "#EC4899",
          "#06B6D4",
          "#F43F5E",
          "#84CC16",
        ],
        borderColor: [
          "#4338CA",
          "#059669",
          "#7C3AED",
          "#D97706",
          "#DB2777",
          "#0891B2",
          "#E11D48",
          "#65A30D",
        ],
        borderWidth: 1,
      },
    ],
  });

  const renderBox = (title, data, fields) => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-indigo-100 transform transition-all duration-300 hover:shadow-2xl">
        <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
          <h3 className="text-lg leading-6 font-medium text-indigo-800">{title}</h3>
        </div>

        {data && Object.keys(data).length > 0 ? (
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              {fields.map(field =>
                data[field] !== undefined && data[field] !== null ? (
                  <div
                    key={field}
                    className="sm:col-span-1 p-3 rounded-lg hover:bg-indigo-50 transition-colors duration-200"
                  >
                    <dt className="text-sm font-medium text-indigo-700">
                      {field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">
                      {typeof data[field] === "number"
                        ? `₹${data[field].toLocaleString()}`
                        : data[field]}
                    </dd>
                  </div>
                ) : null
              )}
            </dl>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6 text-center">
            <p className="text-sm text-gray-500 mb-4">No data available</p>
            {title === "My Form 16" && (
              <button
                onClick={() => navigate("/upload-form16")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-lg text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105 transition-all duration-300"
              >
                Upload Form 16
              </button>
            )}
          </div>
        )}
      </div>

      {data && Object.keys(data).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-xl h-80 border border-indigo-100">
            <h4 className="text-md font-medium text-indigo-700 mb-2">Bar Chart</h4>
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
          <div className="bg-white p-4 rounded-lg shadow-xl h-80 border border-indigo-100">
            <h4 className="text-md font-medium text-indigo-700 mb-2">Doughnut Chart</h4>
            <Doughnut
              data={{
                labels: fields.map(field => field.replace(/_/g, " ").toUpperCase()),
                datasets: [
                  {
                    data: fields.map(field => Number(data?.[field]) || 0),
                    backgroundColor: [
                      "#4F46E5",
                      "#10B981",
                      "#8B5CF6",
                      "#F59E0B",
                      "#EC4899",
                      "#06B6D4",
                      "#F43F5E",
                      "#84CC16",
                    ],
                    borderColor: "#ffffff",
                    borderWidth: 2,
                  },
                ],
              }}
              options={pieChartOptions}
            />
          </div>
        </div>
      )}
    </div>
  );

  const handleMenuClick = section => setSelectedSection(section);

  const renderTaxComparison = () => {
    if (!taxComparisonText) {
      console.log("taxComparisonText is empty or null");
      return null;
    }

    console.log("Raw taxComparisonText:", taxComparisonText); // Debug the raw input

    let taxData;
    try {
      taxData = JSON.parse(taxComparisonText);
      console.log("Parsed taxData:", taxData); // Debug the parsed object
    } catch (err) {
      console.error("Failed to parse tax comparison JSON:", err);
      console.error("Problematic taxComparisonText:", taxComparisonText);
      return (
        <div className="mt-8 text-red-600 text-center">
          Error: Unable to display tax comparison data due to invalid format.
        </div>
      );
    }

    const oldRegime = taxData?.Old_Tax_Regime_2023_24 || {};
    const newRegime = taxData?.New_Tax_Regime_2024_25 || {};
    const comparison = taxData?.Comparison || {};

    console.log("oldRegime:", oldRegime); // Debug the extracted sections
    console.log("newRegime:", newRegime);
    console.log("comparison:", comparison);

    return (
      <div className="mt-8 bg-white rounded-lg shadow-xl overflow-hidden border border-indigo-100 transform transition-all duration-300 hover:shadow-2xl">
        <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
          <h3 className="text-lg leading-6 font-medium text-indigo-800">Tax Saving Analysis</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Comparison of Old (2023-24) vs New (2024-25) Tax Regimes
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-indigo-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                  Old Regime (2023-24)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                  New Regime (2024-25)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Income from Property */}
              <tr className="hover:bg-indigo-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Income from Property
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Amount: ₹{oldRegime?.Income_from_Property?.Amount || "N/A"} <br />
                  Tax Rate: {oldRegime?.Income_from_Property?.Tax_Rate || "N/A"} <br />
                  Tax: ₹{oldRegime?.Income_from_Property?.Tax_Amount || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Amount: ₹{newRegime?.Income_from_Property?.Amount || "N/A"} <br />
                  Tax Rate: {newRegime?.Income_from_Property?.Tax_Rate || "N/A"} <br />
                  Tax: ₹{newRegime?.Income_from_Property?.Tax_Amount || "N/A"}
                </td>
              </tr>

              {/* Agricultural Income */}
              <tr className="hover:bg-indigo-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Agricultural Income
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Amount: ₹{oldRegime?.Agricultural_Income?.Amount || "N/A"} <br />
                  Tax Rate: {oldRegime?.Agricultural_Income?.Tax_Rate || "N/A"} <br />
                  Tax: ₹{oldRegime?.Agricultural_Income?.Tax_Amount || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Amount: ₹{newRegime?.Agricultural_Income?.Amount || "N/A"} <br />
                  Tax Rate: {newRegime?.Agricultural_Income?.Tax_Rate || "N/A"} <br />
                  Tax: ₹{newRegime?.Agricultural_Income?.Tax_Amount || "N/A"}
                </td>
              </tr>

              {/* Capital Gains */}
              <tr className="hover:bg-indigo-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Capital Gains
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Shares: ₹{oldRegime?.Capital_Gains?.Breakdown?.Shares || "N/A"} <br />
                  Equity MF: ₹{oldRegime?.Capital_Gains?.Breakdown?.Equity_Mutual_Funds ||
                    "N/A"}{" "}
                  <br />
                  Real Estate: ₹{oldRegime?.Capital_Gains?.Breakdown?.Real_Estate || "N/A"} <br />
                  Gold: ₹{oldRegime?.Capital_Gains?.Breakdown?.Gold || "N/A"} <br />
                  Total: ₹{oldRegime?.Capital_Gains?.Total || "N/A"} <br />
                  Tax Rate: {oldRegime?.Capital_Gains?.Tax_Rate || "N/A"} <br />
                  Tax: ₹{oldRegime?.Capital_Gains?.Tax_Amount || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Shares: ₹{newRegime?.Capital_Gains?.Breakdown?.Shares || "N/A"} <br />
                  Equity MF: ₹{newRegime?.Capital_Gains?.Breakdown?.Equity_Mutual_Funds ||
                    "N/A"}{" "}
                  <br />
                  Real Estate: ₹{newRegime?.Capital_Gains?.Breakdown?.Real_Estate || "N/A"} <br />
                  Gold: ₹{newRegime?.Capital_Gains?.Breakdown?.Gold || "N/A"} <br />
                  Total: ₹{newRegime?.Capital_Gains?.Total || "N/A"} <br />
                  Tax Rate: {newRegime?.Capital_Gains?.Tax_Rate || "N/A"} <br />
                  Tax: ₹{newRegime?.Capital_Gains?.Tax_Amount || "N/A"}
                </td>
              </tr>

              {/* Other Income */}
              <tr className="hover:bg-indigo-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Other Income
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Amount: ₹{oldRegime?.Other_Income?.Amount || "N/A"} <br />
                  Tax: ₹{oldRegime?.Other_Income?.Tax_Amount || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Amount: ₹{newRegime?.Other_Income?.Amount || "N/A"} <br />
                  Tax: ₹{newRegime?.Other_Income?.Tax_Amount || "N/A"}
                </td>
              </tr>

              {/* Deductions */}
              <tr className="hover:bg-indigo-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Deductions
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Standard: ₹{oldRegime?.Deductions?.Standard_Deduction || "N/A"} <br />
                  Section 80C: ₹{oldRegime?.Deductions?.Section_80C || "N/A"} <br />
                  Total: ₹{oldRegime?.Deductions?.Total_Deductions || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  Standard: ₹{newRegime?.Deductions?.Standard_Deduction || "N/A"} <br />
                  Section 80C: ₹{newRegime?.Deductions?.Section_80C || "N/A"} <br />
                  Total: ₹{newRegime?.Deductions?.Total_Deductions || "N/A"}
                </td>
              </tr>

              {/* Net Taxable Income */}
              <tr className="hover:bg-indigo-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Net Taxable Income
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  ₹{oldRegime?.Net_Taxable_Income || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  ₹{newRegime?.Net_Taxable_Income || "N/A"}
                </td>
              </tr>

              {/* Additional Tax Rate */}
              <tr className="hover:bg-indigo-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Additional Tax Rate
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {oldRegime?.Additional_Tax_Rate || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {newRegime?.Additional_Tax_Rate || "N/A"}
                </td>
              </tr>

              {/* Total Tax */}
              <tr className="hover:bg-indigo-50 transition-colors font-semibold bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-900">
                  Total Tax
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-900">
                  ₹{oldRegime?.Total_Tax || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-900">
                  ₹{newRegime?.Total_Tax || "N/A"}
                </td>
              </tr>

              {/* Comparison Section */}
              <tr className="hover:bg-indigo-50 transition-colors font-semibold bg-gray-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-900">
                  Tax Comparison
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-900" colSpan="2">
                  Old Regime Tax: ₹{comparison?.Old_Regime_Total_Tax || "N/A"} <br />
                  New Regime Tax: ₹{comparison?.New_Regime_Total_Tax || "N/A"} <br />
                  Tax Saving: ₹{comparison?.Tax_Saving || "N/A"} <br />
                  <span className="text-green-600">
                    Recommended: {comparison?.Recommended_Regime || "N/A"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderIcon = iconName => {
    switch (iconName) {
      case "document-text":
        return (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "home":
        return (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              stroke="currentColor"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        );
      case "globe":
        return (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "chart-bar":
        return (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        );
      case "currency-dollar":
        return (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Sidebar */}
      <div
        className={`bg-gradient-to-b from-indigo-600 to-blue-700 shadow-xl transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-indigo-500">
            <h2
              className={`font-semibold text-white transition-opacity duration-200 ${
                isSidebarOpen ? "opacity-100" : "opacity-0 hidden"
              }`}
            >
              Financial Dashboard
            </h2>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-white"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isSidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                )}
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              <li>
                <button
                  onClick={() => setSelectedSection(null)}
                  className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-all duration-200 ${
                    selectedSection === null
                      ? "bg-white text-indigo-700 shadow-md"
                      : "text-white hover:bg-indigo-500"
                  }`}
                >
                  <svg
                    className="h-5 w-5 mr-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  <span
                    className={`transition-opacity duration-200 ${
                      isSidebarOpen ? "opacity-100" : "opacity-0 hidden"
                    }`}
                  >
                    Dashboard Overview
                  </span>
                </button>
              </li>

              {investmentPairs.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleMenuClick(item.title)}
                    className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-all duration-200 ${
                      selectedSection === item.title
                        ? "bg-white text-indigo-700 shadow-md"
                        : "text-white hover:bg-indigo-500"
                    }`}
                  >
                    <div className="mr-3">{renderIcon(item.icon)}</div>
                    <span
                      className={`transition-opacity duration-200 ${
                        isSidebarOpen ? "opacity-100" : "opacity-0 hidden"
                      }`}
                    >
                      {item.title}
                    </span>
                  </button>
                </li>
              ))}

              <li>
                <button
                  onClick={() => navigate("/add-investments")}
                  className="flex items-center w-full px-4 py-2 text-left rounded-lg text-white hover:bg-indigo-500 transition-all duration-200"
                >
                  <svg
                    className="h-5 w-5 mr-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span
                    className={`transition-opacity duration-200 ${
                      isSidebarOpen ? "opacity-100" : "opacity-0 hidden"
                    }`}
                  >
                    Add New Investment
                  </span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => navigate("/upload-form16")}
                  className="flex items-center w-full px-4 py-2 text-left rounded-lg text-white hover:bg-indigo-500 transition-all duration-200"
                >
                  <svg
                    className="h-5 w-5 mr-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span
                    className={`transition-opacity duration-200 ${
                      isSidebarOpen ? "opacity-100" : "opacity-0 hidden"
                    }`}
                  >
                    Upload Form 16
                  </span>
                </button>
              </li>
            </ul>
          </nav>

          <div className="p-4 border-t border-indigo-500">
            <button
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/");
              }}
              className="flex items-center w-full px-4 py-2 text-left text-white hover:bg-indigo-500 rounded-lg transition-all duration-200"
            >
              <svg
                className="h-5 w-5 mr-3 text-red-300"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span
                className={`transition-opacity duration-200 ${
                  isSidebarOpen ? "opacity-100" : "opacity-0 hidden"
                }`}
              >
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-6 px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-indigo-900">
              {selectedSection || "Financial Overview"}
            </h1>

            {profile && (
              <div className="flex items-center">
                <span className="text-sm text-indigo-600 mr-2">Welcome,</span>
                <span className="text-sm font-medium text-indigo-900">{profile.name}</span>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6 animate-pulse">
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

          {!loading && !error && (
            <div className="space-y-8">
              {!selectedSection ? (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-white overflow-hidden shadow-xl rounded-lg border border-indigo-100 transform transition-all duration-300 hover:shadow-2xl hover:scale-105">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-md p-3 shadow-lg">
                            <svg
                              className="h-6 w-6 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-indigo-600 truncate">
                                Total Investments
                              </dt>
                              <dd className="flex items-baseline">
                                <div className="text-2xl font-semibold text-indigo-900">
                                  ₹{totalInvestments.toLocaleString()}
                                </div>
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-xl rounded-lg border border-indigo-100 transform transition-all duration-300 hover:shadow-2xl hover:scale-105">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-md p-3 shadow-lg">
                            <svg
                              className="h-6 w-6 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-green-600 truncate">
                                Investment Categories
                              </dt>
                              <dd className="flex items-baseline">
                                <div className="text-2xl font-semibold text-green-900">4</div>
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-xl rounded-lg border border-indigo-100 transform transition-all duration-300 hover:shadow-2xl hover:scale-105">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-md p-3 shadow-lg">
                            <svg
                              className="h-6 w-6 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-purple-600 truncate">
                                Form 16 Status
                              </dt>
                              <dd className="flex items-baseline">
                                <div className="text-2xl font-semibold text-purple-900">
                                  {form16Data ? "Uploaded" : "Not Uploaded"}
                                </div>
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-xl rounded-lg border border-indigo-100 transform transition-all duration-300 hover:shadow-2xl hover:scale-105">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-md p-3 shadow-lg">
                            <svg
                              className="h-6 w-6 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                              />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-amber-600 truncate">
                                Tax Analysis
                              </dt>
                              <dd className="flex items-baseline">
                                <div className="text-2xl font-semibold text-amber-900">
                                  {taxComparisonText ? "Available" : "Not Generated"}
                                </div>
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white shadow-xl rounded-lg p-6 h-120 border border-indigo-100">
                      <h2 className="text-lg font-medium text-indigo-800 mb-4">
                        Investment Distribution
                      </h2>
                      <Bar
                        data={summaryChartData}
                        options={{
                          ...chartOptions,
                          plugins: {
                            ...chartOptions.plugins,
                            title: {
                              ...chartOptions.plugins.title,
                              text: "Investment Distribution",
                            },
                          },
                        }}
                      />
                    </div>

                    <div className="bg-white shadow-xl rounded-lg p-6 h-120 border border-indigo-100">
                      <h2 className="text-lg font-medium text-indigo-800 mb-4">
                        Investment Breakdown
                      </h2>
                      <Pie data={pieChartData} options={pieChartOptions} />
                    </div>

                    <div className="bg-white shadow-xl rounded-lg p-6 h-120 border border-indigo-100">
                      <h2 className="text-lg font-medium text-indigo-800 mb-4">
                        Investment Growth
                      </h2>
                      <Line data={lineChartData} options={chartOptions} />
                    </div>

                    <div className="bg-white shadow-xl rounded-lg p-6 h-120 border border-indigo-100">
                      <h2 className="text-lg font-medium text-indigo-800 mb-4">Investment Radar</h2>
                      <Radar data={radarChartData} options={radarChartOptions} />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={fetchTaxComparison}
                      disabled={taxLoading}
                      className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white ${
                        taxLoading
                          ? "bg-indigo-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105"
                      } transition-all duration-300`}
                    >
                      {taxLoading ? (
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
                          Generating Tax Options...
                        </>
                      ) : (
                        "Generate Tax Saving Options"
                      )}
                    </button>

                    <button
                      onClick={fetchStoredTaxComparison}
                      disabled={taxLoading}
                      className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white ${
                        taxLoading
                          ? "bg-purple-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform hover:scale-105"
                      } transition-all duration-300`}
                    >
                      {taxLoading ? (
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
                          Loading Stored Options...
                        </>
                      ) : (
                        "Load Stored Tax Options"
                      )}
                    </button>
                  </div>

                  {renderTaxComparison()}

                  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl rounded-lg overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:scale-105">
                    <div className="px-6 py-8 sm:p-10 text-white">
                      <h3 className="text-xl font-bold">Add More Investments</h3>
                      <div className="mt-2 max-w-xl text-indigo-100">
                        <p>
                          Add more investments to optimize your tax savings and get personalized
                          recommendations.
                        </p>
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={() => navigate("/add-investments")}
                          className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white transition-all duration-300 transform hover:scale-105"
                        >
                          Add Investments
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  {investmentPairs
                    .filter(item => item.title === selectedSection)
                    .map((item, index) => (
                      <div key={index}>{renderBox(item.title, item.data, item.fields)}</div>
                    ))}
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-indigo-300 shadow-lg text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105"
                  >
                    <svg
                      className="mr-2 -ml-1 h-5 w-5 text-indigo-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
