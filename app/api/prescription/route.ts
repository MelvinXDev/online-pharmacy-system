import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const promptText = `
You are a helpful pharmacist AI assistant reviewing a submitted prescription or medical request image.
Give advice on the context provided in the image and extract the recommended items if they match standard pharmaceutical drugs over the counter or requires prescription.
Respond strictly in JSON format with an array of objects.
Each object should have:
- name: The name of the medication or item.
- reason: Why it was prescribed based on the visual context.
- quantity: Recommended quantity or dosage from the image if present.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { 
        parts: [
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }, 
          { text: promptText }
        ] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  quantity: { type: Type.STRING }
                },
                required: ["name", "reason"]
              }
            }
          },
          required: ["recommendations"]
        }
      }
    });

    return NextResponse.json({ result: response.text });
  } catch (error: any) {
    console.error("AI Rx Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
