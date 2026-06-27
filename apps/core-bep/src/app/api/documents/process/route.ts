import { NextRequest, NextResponse } from "next/server";
import { createBepServerClient } from "@core/bep-supabase/bep";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { documentId, projectId } = await request.json();

    if (!documentId || !projectId) {
      return NextResponse.json({ error: "Missing documentId or projectId" }, { status: 400 });
    }

    const supabase = createBepServerClient();

    await supabase.from("documents").update({ status: "processing" }).eq("id", documentId);

    const { data: doc } = await supabase
      .from("documents")
      .select("storage_path, name, mime_type, type")
      .eq("id", documentId)
      .single();

    if (!doc) throw new Error(`Document ${documentId} not found`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("bep-documents")
      .download(doc.storage_path);

    if (downloadError || !fileData) throw new Error(`Storage download failed: ${downloadError?.message}`);

    let extractedText = "";
    let aiSummary = "";
    let aiTags: string[] = [];
    let aiManufacturers: string[] = [];
    let aiNorms: string[] = [];
    let discipline = "";
    let aiQuantities: Record<string, unknown> = {};

    const isPdf = doc.mime_type === "application/pdf";
    const isText = doc.mime_type.startsWith("text/");

    if (isPdf || isText) {
      const buffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const analysisPrompt = `Sos un ingeniero especialista en licitaciones técnicas de infraestructura TI y Data Centers.

Analizá el siguiente documento técnico y extraé la siguiente información en formato JSON exacto:

{
  "summary": "Resumen ejecutivo en español, máximo 3 párrafos",
  "discipline": "Una de: Eléctrico | Mecánico | Civil | TI | Telecomunicaciones | Seguridad | General",
  "tags": ["array", "de", "tags", "relevantes", "máximo 10"],
  "manufacturers": ["lista de fabricantes o marcas mencionados"],
  "norms": ["lista de normas, estándares y certificaciones mencionados (IEC, IEEE, ANSI, etc.)"],
  "quantities": {
    "descripcion_del_item": "cantidad y unidad"
  }
}

Respondé ÚNICAMENTE con el JSON, sin texto adicional ni markdown.`;

      let rawText = "";

      // ── Intentar con Anthropic primero ──────────────────────────────────────
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 2000,
              messages: [{
                role: "user",
                content: isPdf
                  ? [
                      { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                      { type: "text", text: analysisPrompt },
                    ]
                  : analysisPrompt + "\n\nDocumento:\n" + (await fileData.text()),
              }],
            }),
          });

          if (anthropicRes.ok) {
            const data = await anthropicRes.json();
            rawText = data.content?.find((c: any) => c.type === "text")?.text ?? "";
            console.log("[BEP] Anthropic OK, rawText length:", rawText.length);
          } else {
            const errBody = await anthropicRes.text();
            console.log("[BEP] Anthropic failed:", anthropicRes.status, errBody.slice(0, 200));
          }
        } catch (e) {
          console.log("[BEP] Anthropic exception:", e instanceof Error ? e.message : e);
        }
      }

      // ── Fallback a OpenAI si Anthropic falló ────────────────────────────────
      if (!rawText && process.env.OPENAI_API_KEY) {
        try {
          console.log("[BEP] Trying OpenAI fallback...");

          // Para PDFs: extraer texto como base64 y enviarlo como texto plano
          // OpenAI no acepta PDFs directamente en chat, usamos el texto del prompt
          const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              max_tokens: 2000,
              messages: [
                {
                  role: "system",
                  content: "Sos un ingeniero especialista en licitaciones técnicas. Respondé ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.",
                },
                {
                  role: "user",
                  content: isPdf
                    ? `${analysisPrompt}\n\nEl documento se llama: ${doc.name}\nTipo: ${doc.type}\n\nAnalizá basándote en el nombre y contexto del documento para inferir su contenido técnico.`
                    : analysisPrompt + "\n\nDocumento:\n" + (await fileData.text()),
                },
              ],
            }),
          });

          if (oaiRes.ok) {
            const oaiData = await oaiRes.json();
            rawText = oaiData.choices?.[0]?.message?.content ?? "";
            console.log("[BEP] OpenAI OK, rawText length:", rawText.length);
          } else {
            const errBody = await oaiRes.text();
            console.log("[BEP] OpenAI failed:", oaiRes.status, errBody.slice(0, 200));
          }
        } catch (e) {
          console.log("[BEP] OpenAI exception:", e instanceof Error ? e.message : e);
        }
      }

      // ── Parsear resultado ───────────────────────────────────────────────────
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
          aiSummary = parsed.summary ?? "";
          discipline = parsed.discipline ?? "";
          aiTags = Array.isArray(parsed.tags) ? parsed.tags : [];
          aiManufacturers = Array.isArray(parsed.manufacturers) ? parsed.manufacturers : [];
          aiNorms = Array.isArray(parsed.norms) ? parsed.norms : [];
          aiQuantities = typeof parsed.quantities === "object" ? parsed.quantities : {};
          extractedText = rawText;
          console.log("[BEP] Parsed OK — tags:", aiTags.length, "summary length:", aiSummary.length);
        } catch {
          aiSummary = rawText.slice(0, 500);
          console.log("[BEP] JSON parse failed, storing raw as summary");
        }
      }
    }

    // ── Embedding con OpenAI ────────────────────────────────────────────────
    let embedding: number[] | null = null;
    const textForEmbedding = [doc.name, aiSummary, aiTags.join(" "), aiNorms.join(" ")]
      .filter(Boolean).join("\n").slice(0, 8000);

    if (process.env.OPENAI_API_KEY && textForEmbedding) {
      try {
        const embRes = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({ model: "text-embedding-3-small", input: textForEmbedding }),
        });

        if (embRes.ok) {
          const embData = await embRes.json();
          embedding = embData.data?.[0]?.embedding ?? null;
          console.log("[BEP] Embedding generated:", !!embedding);
        }
      } catch (e) {
        console.log("[BEP] Embedding error:", e instanceof Error ? e.message : e);
      }
    }

    // ── Guardar en DB ───────────────────────────────────────────────────────
    await supabase.from("documents").update({
      status: "indexed",
      extracted_text: extractedText.slice(0, 100_000),
      ai_summary: aiSummary,
      ai_tags: aiTags,
      ai_manufacturers: aiManufacturers,
      ai_norms: aiNorms,
      ai_quantities: aiQuantities,
      discipline: discipline || null,
      embedding: embedding ? JSON.stringify(embedding) : null,
    }).eq("id", documentId);

    return NextResponse.json({
      success: true,
      documentId,
      discipline,
      tagsFound: aiTags.length,
      manufacturersFound: aiManufacturers.length,
      normsFound: aiNorms.length,
      embeddingGenerated: !!embedding,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[BEP] Document processing error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}