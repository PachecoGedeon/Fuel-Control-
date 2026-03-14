import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function findNearbyPlaces(type: 'gas_station' | 'car_repair', lat: number, lng: number) {
  const prompt = type === 'gas_station' 
    ? `Encontre postos de combustível próximos às coordenadas (${lat}, ${lng}) com os melhores preços e localizações.`
    : `Encontre lojas de auto peças ou oficinas mecânicas próximas às coordenadas (${lat}, ${lng}).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    return {
      text: response.text,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Error finding nearby places:", error);
    throw error;
  }
}
