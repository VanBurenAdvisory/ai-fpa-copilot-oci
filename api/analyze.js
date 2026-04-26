export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
const { company_name, months, questions, data } = req.body;
const financialData = months || data || [];

const enhancedData = financialData.map(row => {
  const revenue = Number(row.Revenue || row.revenue || 0);
  const cogs = Number(row.COGS || row.cogs || 0);
  const opex = Number(row.OperatingExpense || row.operatingExpense || row.opex || 0);

  const grossMargin = revenue ? ((revenue - cogs) / revenue) : null;
  const operatingMargin = revenue ? ((revenue - cogs - opex) / revenue) : null;

  return {
    ...row,
    GrossMargin: grossMargin,
    OperatingMargin: operatingMargin
  };
});

 const prompt = `
You are a senior FP&A leader presenting to a CFO.

Analyze the financial data for ${company_name || "the company"}.

Focus on:
- Revenue trends (growth, seasonality)
- Margin trends (COGS and operating leverage)
- Cost structure changes
- Any anomalies or inflection points

Then produce:

1. Executive Summary (3–5 sentences, concise, business-focused)
2. Key Drivers (3–5 bullets, specific and numeric where possible)
3. Risks (3 bullets, realistic, not generic)
4. Scenarios:
   - Base: what is most likely
   - Upside: what would need to go right
   - Downside: what could go wrong

Be specific. Reference trends in the data. Avoid generic statements.

Data:
${JSON.stringify(enhancedData, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "executive_summary": "...",
  "key_drivers": ["..."],
  "risks": ["..."],
  "scenarios": {
    "base": "...",
    "upside": "...",
    "downside": "..."
  }
}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    const text = result.output?.[0]?.content?.[0]?.text || "{}";
    const parsed = JSON.parse(text);

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}