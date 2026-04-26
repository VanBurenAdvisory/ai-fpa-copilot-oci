export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data } = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Analyze this financial data: ${JSON.stringify(data)}`
      })
    });

    const result = await response.json();

    res.status(200).json({
      output: result.output?.[0]?.content?.[0]?.text || "No response"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
