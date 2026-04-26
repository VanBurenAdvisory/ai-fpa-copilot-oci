const analyzeBtn = document.getElementById("analyzeBtn");
const csvFileInput = document.getElementById("csvFile");
const companyNameInput = document.getElementById("companyName");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

const API_URL = "https://YOUR_API_GATEWAY_URL/analyze";

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

function renderResult(data) {
  outputEl.innerHTML = `
    <h3>Executive Summary</h3>
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

  if (!file) {
    statusEl.textContent = "Please select a CSV file.";
    return;
  }

  try {
    statusEl.textContent = "Reading CSV...";
    const csvText = await file.text();
    const rows = csvToJson(csvText);

    const payload = {
      company_name: companyName,
      months: rows,
      questions: [
        "Summarize trends",
        "Provide base, upside, and downside scenarios",
        "List the top 3 business risks"
      ]
    };

    statusEl.textContent = "Calling OCI API...";
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