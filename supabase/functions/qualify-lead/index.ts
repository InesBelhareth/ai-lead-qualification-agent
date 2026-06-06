import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse Request Body
    const body = await req.json()
    const { name, email, company, message, budget } = body

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Name and email are required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Optional enrichment via Serper.dev
    let companySearchData = null
    const serperKey = Deno.env.get("SERPER_API_KEY")
    if (serperKey && company) {
      try {
        console.log(`🔍 Enriching company info via Serper.dev for: ${company}`)
        const serperRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ q: `${company} LinkedIn` })
        })
        if (serperRes.ok) {
          companySearchData = await serperRes.json()
        }
      } catch (err) {
        console.error("Serper API error:", err)
      }
    }

    // 3. Call OpenAI GPT-4o-mini for qualification
    const openAiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openAiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable in Supabase.")
    }

    console.log(`🤖 Scoring lead via GPT-4o-mini: ${name} (${company || 'No Company'})`)
    
    const systemPrompt = `You are a lead qualification assistant. Analyze the lead data and return ONLY a valid JSON object with these fields:
- score: integer from 0 to 100
- category: one of 'hot', 'warm', 'cold'
- summary: 2-sentence qualification summary
- recommended_action: next step to take with this lead
- reasoning: brief explanation of the score

Return ONLY the JSON object, no markdown, no extra text.`

    const userPrompt = `Qualify this lead:

Name: ${name}
Email: ${email}
Company: ${company || 'Unknown'}
Message: ${message || 'No message provided'}
Budget: ${budget || 'Not specified'}

Company Search Results (from LinkedIn/Google via Serper.dev):
${companySearchData ? JSON.stringify(companySearchData) : 'No search results available.'}`

    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3
      })
    })

    if (!openAiRes.ok) {
      const errorText = await openAiRes.text()
      throw new Error(`OpenAI API returned error: ${openAiRes.status} ${errorText}`)
    }

    const openAiData = await openAiRes.json()
    const aiContent = openAiData.choices?.[0]?.message?.content?.trim() || ""

    let qualification
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      qualification = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent)
    } catch (e) {
      console.error("Failed to parse GPT response:", aiContent, e)
      qualification = {
        score: 50,
        category: 'warm',
        summary: 'Failed to parse qualification results from AI.',
        recommended_action: 'Manual review required.',
        reasoning: 'AI response parse error.'
      }
    }

    // 4. Initialize Supabase Client & Save to DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase URL or Service Role Key in environment variables.")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const leadRecord = {
      name,
      email,
      company: company || null,
      message: message || null,
      budget: budget || null,
      score: qualification.score,
      category: qualification.category,
      summary: qualification.summary,
      recommended_action: qualification.recommended_action,
      reasoning: qualification.reasoning,
      received_at: new Date().toISOString(),
      qualified_at: new Date().toISOString()
    }

    console.log(`💾 Saving lead to Database: ${name}`)
    const { data: dbData, error: dbError } = await supabase
      .from('leads')
      .insert([leadRecord])
      .select()
      .single()

    if (dbError) {
      throw dbError
    }

    // 5. Trigger external notifications if Lead is HOT
    if (qualification.category === 'hot' || qualification.score > 70) {
      // Slack webhook notification (if configured)
      const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL')
      if (slackWebhookUrl) {
        try {
          console.log(`📢 Sending hot lead Slack alert for: ${name}`)
          await fetch(slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 *Hot Lead Alert (Serverless Function)*!\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n🏢 *Company:* ${company || 'N/A'}\n📈 *Score:* ${qualification.score}/100\n⚡ *Action:* ${qualification.recommended_action}`
            })
          })
        } catch (err) {
          console.error("Failed to send Slack alert:", err)
        }
      }

      // HubSpot CRM Integration (if configured)
      const hubspotToken = Deno.env.get('HUBSPOT_ACCESS_TOKEN')
      if (hubspotToken) {
        try {
          console.log(`💼 Creating HubSpot Contact for: ${name}`)
          await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hubspotToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              properties: {
                email,
                firstname: name.split(' ')[0] || name,
                lastname: name.split(' ').slice(1).join(' ') || '',
                company: company || '',
                message: message || ''
              }
            })
          })
        } catch (err) {
          console.error("Failed to create HubSpot contact:", err)
        }
      }
    }

    // 6. Return response
    return new Response(
      JSON.stringify({
        success: true,
        lead_id: dbData.id,
        score: qualification.score,
        category: qualification.category,
        summary: qualification.summary,
        recommended_action: qualification.recommended_action,
        reasoning: qualification.reasoning,
        message: 'Lead qualified and saved successfully.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Function error:", error)
    return new Response(
      JSON.stringify({ error: error.message || error }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
