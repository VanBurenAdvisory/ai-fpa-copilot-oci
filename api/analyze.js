export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { company_name, months, questions, data } = req.body;
    const financialData = months || data || [];

    const prompt = `
You are a senior FP&A advisor.

Analyze the following financial data for ${company_name || "Demo Company"}:

${JSON.stringify(financialData, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "executive_summary": "A concise CFO-level summary.",
  "key_drivers": ["driver 1", "driver 2", "driver 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "scenarios": {
    "base": "base case scenario",
    "upside": "upside scenario",
    "downside": "downside scenario"
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