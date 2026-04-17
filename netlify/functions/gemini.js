// netlify/functions/gemini.js
// Bulletproof Gemini handler with retry, timeout protection, and clear error messages

const MODEL = "gemini-2.5-flash-lite"
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
const TIMEOUT_MS = 25000 // Netlify free = 10s, paid = 26s. Set to 25s to leave margin.

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function callGemini(key, body, attempt = 1) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res
  try {
    res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err.name === "AbortError") throw new Error("Request timed out — PDF may be too large. Try a shorter date range.")
    throw new Error("Network error contacting Gemini: " + err.message)
  }
  clearTimeout(timer)

  // If response is not OK, parse the error properly
  if (!res.ok) {
    let errMsg = `Gemini API error ${res.status}`
    try {
      const errBody = await res.json()
      const detail = errBody?.error?.message || errBody?.error?.status || ""
      if (detail) errMsg += ": " + detail
    } catch {
      // Could not parse error body — likely HTML error page
      const text = await res.text().catch(() => "")
      if (text.includes("<html") || text.includes("<!DOCTYPE")) {
        errMsg = res.status === 429
          ? "Rate limit hit — too many requests. Wait 60 seconds and try again."
          : `Gemini returned an unexpected error page (${res.status}). Check your API key in Netlify environment variables.`
      }
    }

    // Auto-retry once on rate limit (429) or server error (5xx)
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const delay = res.status === 429 ? 5000 : 2000
      console.log(`Gemini ${res.status} — retrying in ${delay}ms (attempt ${attempt})`)
      await sleep(delay)
      return callGemini(key, body, attempt + 1)
    }

    throw new Error(errMsg)
  }

  // Parse successful response
  let json
  try {
    json = await res.json()
  } catch {
    throw new Error("Gemini returned unparseable response. Try again.")
  }

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    const reason = json?.candidates?.[0]?.finishReason
    if (reason === "MAX_TOKENS") throw new Error("Response too long — PDF has too many transactions. Try splitting into smaller date ranges.")
    if (reason === "SAFETY") throw new Error("Content blocked by safety filter.")
    throw new Error("No text in Gemini response. Finish reason: " + (reason || "unknown"))
  }

  return text
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  }

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }

  const key = process.env.GEMINI_KEY
  if (!key) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "GEMINI_KEY environment variable not set in Netlify." }),
    }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body." }) }
  }

  const { type, data, mime } = payload
  if (!data) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "No file data provided." }) }
  }

  try {
    let geminiBody

    if (type === "receipt") {
      geminiBody = {
        contents: [{
          parts: [
            {
              inline_data: { mime_type: mime || "image/jpeg", data }
            },
            {
              text: `Extract receipt data and return ONLY valid JSON with no markdown, no explanation, no backticks. 
Return exactly this shape:
{"merchant":"string","date":"YYYY-MM-DD","amount":number,"category":"string"}

For category use one of: Groceries, Restaurants, Transport, Healthcare, Shopping, Utilities, Subscriptions, Entertainment, Property, Housing, Personal Care, Income, Transfer, Other

If you cannot read a field, use empty string or 0.`
            }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
      }
    } else if (type === "pdf") {
      geminiBody = {
        contents: [{
          parts: [
            {
              inline_data: { mime_type: "application/pdf", data }
            },
            {
              text: `Extract ALL transactions from this bank or credit card statement.
Return ONLY a valid JSON array with no markdown, no explanation, no backticks.
Each item must have exactly these fields:
{"date":"YYYY-MM-DD","merch":"merchant name","amt":number,"cat":"category"}

Rules:
- amt is NEGATIVE for purchases/debits/charges, POSITIVE for payments/credits/deposits/refunds
- For credit card statements: purchases are negative, payments to the card are positive
- For bank statements: withdrawals/debits are negative, deposits are positive
- date must be YYYY-MM-DD format
- cat must be one of: Groceries, Restaurants, Transport, Healthcare, Shopping, Utilities, Subscriptions, Entertainment, Property, Housing, Personal Care, Income, Transfer, Other
- Include ALL transactions visible in the statement
- Also look for the account number (last 4 digits) anywhere in the document and include it as a separate field "last4":"XXXX" in the first item only

Return a JSON array starting with [ and ending with ]`
            }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
      }
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown type: " + type }) }
    }

    const text = await callGemini(key, geminiBody)
    return { statusCode: 200, headers, body: JSON.stringify({ text }) }

  } catch (err) {
    console.error("Gemini function error:", err.message)
    return {
      statusCode: 200, // Return 200 so App.jsx receives the error field instead of a fetch failure
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
