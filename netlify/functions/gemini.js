exports.handler = async event => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" }
  }
  try {
    const { type, data, mime } = JSON.parse(event.body)
    const key = process.env.GEMINI_KEY
    if (!key) return { statusCode: 500, body: JSON.stringify({ error: "No Gemini key configured" }) }
    let parts
    if (type === "receipt") {
      parts = [
        { inline_data: { mime_type: mime, data } },
        { text: `Extract from this receipt. Return ONLY valid JSON, no markdown: {"merchant":"","date":"YYYY-MM-DD","amount":0,"category":""}. Category must be one of: Housing, Groceries, Restaurants, Transport, Healthcare, Shopping, Entertainment, Utilities, Personal Care, Subscriptions, Property, Income, Transfer, Other` }
      ]
    } else if (type === "pdf") {
      parts = [
        { inline_data: { mime_type: "application/pdf", data } },
        { text: `Extract every transaction from this bank or credit card statement. Return ONLY a JSON array, no markdown, no explanation. Each item must have: {"date":"YYYY-MM-DD","merch":"clean merchant name","amt":number,"cat":"category"}. Rules: purchases and charges are negative numbers, payments and credits and refunds are positive numbers. Skip totals, summary rows, and any row with $0.00. Categories must be exactly one of: Housing, Groceries, Restaurants, Transport, Healthcare, Shopping, Entertainment, Utilities, Personal Care, Subscriptions, Property, Income, Transfer, Other` }
      ]
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: "Unknown type" }) }
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    )
    const result = await res.json()
    if (result.error) {
      return { statusCode: 400, body: JSON.stringify({ error: result.error.message }) }
    }
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ""
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}