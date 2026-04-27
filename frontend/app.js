const analyzeBtn = document.getElementById("analyzeBtn");
const csvFileInput = document.getElementById("csvFile");
const companyNameInput = document.getElementById("companyName");
const summaryLevelInput = document.getElementById("summaryLevel");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const analyzeAllDataInput = document.getElementById("analyzeAllData");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

const API_URL = "https://ai-fpa-copilot-oci.vercel.app/api/analyze";

function csvToJson(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const row = {};
    headers.forEach((header, i) => {
      const raw = values[i];
      const asNum = Number(raw);
      row[header] = Number.isNaN(asNum) ? raw : asNum;
    });
    return row;
  });
}

function findDateColumn(row) {
  const dateColumns = ["Date", "date", "Month", "month", "Period", "period"];
  return dateColumns.find(column => Object.prototype.hasOwnProperty.call(row, column));
}

function toggleDateRangeControls() {
  const isAnalyzingAllData = analyzeAllDataInput.checked;
  startDateInput.disabled = isAnalyzingAllData;
  endDateInput.disabled = isAnalyzingAllData;
}

function filterRowsByDate(rows, startDate, endDate) {
  if (!rows.length) {
    return rows;
  }

  const dateColumn = findDateColumn(rows[0]);

  if (!dateColumn) {
    throw new Error("No Date, Month, or Period column was found in the CSV.");
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);

  return rows.filter(row => {
    const rowDate = new Date(row[dateColumn]);

    if (Number.isNaN(rowDate.getTime())) {
      return false;
    }

    return rowDate >= start && rowDate <= end;
  });
}

function getSummaryLabel(level) {
  const labels = {
    executive: "Executive Level",
    management: "Management Level",
    detailed: "Detailed Analysis"
  };

  return labels[level] || labels.executive;
}

function renderResult(data) {
  outputEl.innerHTML = `
    <h3>${getSummaryLabel(data.summary_level)} Summary</h3>
    <p>${data.executive_summary || ""}</p>

    <h3>Key Drivers</h3>
    <ul>${(data.key_drivers || []).map(x => `<li>${x}</li>`).join("")}</ul>

    <h3>Risks</h3>
    <ul>${(data.risks || []).map(x => `<li>${x}</li>`).join("")}</ul>

    <h3>Scenarios</h3>
    <p><strong>Base:</strong> ${data.scenarios?.base || ""}</p>
    <p><strong>Upside:</strong> ${data.scenarios?.upside || ""}</p>
    <p><strong>Downside:</strong> ${data.scenarios?.downside || ""}</p>
  `;
}

analyzeBtn.addEventListener("click", async () => {
  const file = csvFileInput.files[0];
  const companyName = companyNameInput.value || "DemoCo";
  const summaryLevel = summaryLevelInput.value;
  const analyzeAllData = analyzeAllDataInput.checked;
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!file) {
    statusEl.textContent = "Please select a CSV file.";
    return;
  }

  if (!analyzeAllData && (!startDate || !endDate)) {
    statusEl.textContent = "Please select a start and end date, or choose Analyze all Data.";
    return;
  }

  if (!analyzeAllData && startDate > endDate) {
    statusEl.textContent = "Start date must be before the end date.";
    return;
  }

  try {
    statusEl.textContent = "Reading CSV...";
    const csvText = await file.text();
    const rows = csvToJson(csvText);
    const rowsToAnalyze = analyzeAllData ? rows : filterRowsByDate(rows, startDate, endDate);

    if (!rowsToAnalyze.length) {
      statusEl.textContent = "No rows matched the selected data range.";
      return;
    }

    const payload = {
      company_name: companyName,
      data: rowsToAnalyze,
      summary_level: summaryLevel,
      date_range: {
        analyze_all_data: analyzeAllData,
        start_date: analyzeAllData ? null : startDate,
        end_date: analyzeAllData ? null : endDate,
        total_rows: rows.length,
        analyzed_rows: rowsToAnalyze.length
      },
      questions: [
        "Summarize trends",
        "Provide base, upside, and downside scenarios",
        "List the top 3 business risks"
      ]
    };

    statusEl.textContent = "Generating analysis...";
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }

    const result = await response.json();
    renderResult(result);
    statusEl.textContent = "Done.";
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
});

analyzeAllDataInput.addEventListener("change", toggleDateRangeControls);
toggleDateRangeControls();
