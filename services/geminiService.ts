import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BillData } from "../types";

// Note: We create a function to get the client to ensure we always use the latest key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const billSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    customerName: { type: Type.STRING, description: "Full name of the customer (e.g. NATALIE WESTRING)" },
    customerFirstName: { type: Type.STRING, description: "First name of the customer extracted from the full name (e.g. NATALIE)" },
    serviceAddress: { type: Type.STRING, description: "Service address including city, state, zip" },
    meterNumber: { type: Type.STRING, description: "Meter number listed on the bill" },
    accountNumber: { type: Type.STRING, description: "Account number" },
    amountDue: { type: Type.NUMBER, description: "Total amount due" },
    dueDate: { type: Type.STRING, description: "Due date of the bill" },
    supplyCharges: { type: Type.NUMBER, description: "Total supply charges in dollars" },
    deliveryCharges: { type: Type.NUMBER, description: "Total delivery charges in dollars" },
    energyTip: { type: Type.STRING, description: "The 'Want to save?' energy tip text provided on the bill" },
    priceToCompare: { type: Type.NUMBER, description: "The PPL Electric Utilities Price to Compare rate per kWh" },
    billMonth: { type: Type.STRING, description: "The current month shown in the usage summary/comparison section (e.g. November)" },
    amountComparisonSentence: { type: Type.STRING, description: "A short sentence comparing the current bill amount to the previous balance/bill. (e.g. 'It is $46 less than last month'). Use 'Previous Balance' from Billing Summary as last month's amount." },
    energyTipSentence: { type: Type.STRING, description: "A short, friendly sentence summarizing the specific advice in the energy tip found on the bill." },
    monthlyComparison: {
      type: Type.OBJECT,
      description: "Data from the comparison table showing usage, temp, and cost for two years",
      properties: {
        month: { type: Type.STRING, description: "The month name for the comparison (e.g. November)" },
        labelPreviousYear: { type: Type.STRING, description: "The year label for the previous period column (e.g. 2024)" },
        labelCurrentYear: { type: Type.STRING, description: "The year label for the current period column (e.g. 2025)" },
        usagePrevious: { type: Type.NUMBER, description: "Electricity Usage (kWh) for the previous year" },
        usageCurrent: { type: Type.NUMBER, description: "Electricity Usage (kWh) for the current year" },
        tempPrevious: { type: Type.NUMBER, description: "Avg. Temperature for the previous year" },
        tempCurrent: { type: Type.NUMBER, description: "Avg. Temperature for the current year" },
        dailyCostPrevious: { type: Type.NUMBER, description: "Avg. Daily Cost for the previous year" },
        dailyCostCurrent: { type: Type.NUMBER, description: "Avg. Daily Cost for the current year" },
      },
      required: ["month", "labelPreviousYear", "labelCurrentYear", "usagePrevious", "usageCurrent", "tempPrevious", "tempCurrent", "dailyCostPrevious", "dailyCostCurrent"]
    },
    energySaverRank: { type: Type.STRING, description: "Energy Saver Rank based SOLELY on usage reduction percentage: 'G.O.A.T.' (>20% usage reduction), 'All-Star' (10-20% usage reduction), 'Pro' (1-10% usage reduction), or 'Amateur' (no reduction or increased usage). Rank is based on usage only, not cost." },
    percentToNextLevel: { type: Type.NUMBER, description: "Additional percentage reduction needed to reach the next rank level. Calculate: If Amateur, need 1% total reduction (so if at 0%, return 1). If Pro, need 10% total reduction (so if at 5%, return 5 more). If All-Star, need 20% total reduction (so if at 12%, return 8 more). If G.O.A.T., return 0." },
    nextRank: { type: Type.STRING, description: "Name of the next rank level: 'Pro' if Amateur, 'All-Star' if Pro, 'G.O.A.T.' if All-Star, empty string if already G.O.A.T." },
    rankDescription: { type: Type.STRING, description: "A warm, encouraging paragraph in Little Wins tone explaining the user's Energy Saver Rank. Should focus on micro-wins, building confidence, and one doable next step. Start with acknowledging what they're doing right, then mention a small win they can take today." },
    rankVisualPrompt: { type: Type.STRING, description: "A prompt to generate a 3D AI cartoon character representing the Energy Saver Rank. The character should be cute, friendly, and colorful. For G.O.A.T.: a cartoon goat character (a cute goat with friendly expression). For All-Star: a cartoon star character (a cute star with eyes and friendly expression). For Pro: a cartoon character representing professionalism (like a cartoon athlete or professional character). For Amateur: a cartoon character representing a beginner (like a cute cartoon seedling or young character ready to learn). The character should be holding or displaying elements related to energy efficiency (like a lightbulb, wind turbine, or energy symbol). Style should be 3D rendered, colorful, cute, and inviting - like a cartoon mascot." }
  },
  required: ["customerName", "customerFirstName", "serviceAddress", "meterNumber", "accountNumber", "amountDue", "dueDate", "supplyCharges", "deliveryCharges", "energyTip", "priceToCompare", "billMonth", "amountComparisonSentence", "energyTipSentence", "monthlyComparison", "energySaverRank", "percentToNextLevel", "nextRank", "rankDescription", "rankVisualPrompt"]
};

export const analyzeBill = async (base64Pdf: string): Promise<BillData> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Pdf,
            },
          },
          {
            text: `Analyze this electric bill PDF.
            
            LOGIC FOR ENERGY SAVER RANK:
            Compare the current month's usage to the previous year's same month.
            Calculate the percentage change in usage: ((usageCurrent - usagePrevious) / usagePrevious) * 100
            Note: A negative percentage means usage decreased (good), positive means usage increased.
            
            Rank Assignment (based SOLELY on usage reduction, NOT cost):
            - G.O.A.T.: Usage decreased by >20% (usageCurrent < usagePrevious by more than 20%)
            - All-Star: Usage decreased by 10-20% (usageCurrent < usagePrevious by 10-20%)
            - Pro: Usage decreased by 1-10% (usageCurrent < usagePrevious by 1-10%)
            - Amateur: Usage increased OR no decrease (usageCurrent >= usagePrevious)
            
            IMPORTANT: Rank is based ONLY on usage reduction percentage. Cost may increase due to rate changes, but that doesn't affect the rank if usage decreased.
            
            Percentage to Next Level Calculation:
            Calculate the current usage reduction percentage: ((usagePrevious - usageCurrent) / usagePrevious) * 100
            - If Amateur (0% or negative reduction): Need 1% total reduction to reach Pro, so return 1 (or 1 - current% if already positive)
            - If Pro (1-10% reduction): Need 10% total reduction to reach All-Star, so return (10 - current%)
            - If All-Star (10-20% reduction): Need 20% total reduction to reach G.O.A.T., so return (20 - current%)
            - If G.O.A.T. (>20% reduction): Return 0
            
            Next Rank Assignment:
            - If Amateur: nextRank = "Pro"
            - If Pro: nextRank = "All-Star"
            - If All-Star: nextRank = "G.O.A.T."
            - If G.O.A.T.: nextRank = "" (empty string)
            
            TONE: Little Wins Tone
            Warm. Encouraging. Calm. Focused on micro-wins and building confidence.
            
            Core voice:
            Light, friendly, reassuring. Feels like a quiet coach helping you find momentum. Always focuses on one doable next step.
            
            How it sounds:
            - "You are doing more right than you think."
            - "Here is a small win you can take today."
            - "Let me show you something simple in your bill that can help you feel more in control."
            - "This change may look small, but it can make your month feel easier."
            - "If you want another idea, I can help you find the next one."
            
            When reviewing a bill:
            - "I looked at your usage and saw one place where a small change could help bring your bill down a bit."
            - "Here is a simple step that gives people like you a quick win."
            - "This one usually feels easy and has a fast payoff."
            - "If you would like to try one more, I can help you find it."
            
            Emotional goal:
            Micro serotonin. Relief. Momentum. A sense that progress is possible right now.
            
            For rankDescription:
            - Start with acknowledging what they're doing right or a small win they've achieved
            - Focus on one simple, doable next step
            - Use warm, encouraging language
            - Make them feel that progress is possible right now
            
            Extract all data into the JSON structure:`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: billSchema,
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as BillData;
    }
    throw new Error("No data extracted");
  } catch (error) {
    console.error("Error analyzing bill:", error);
    throw error;
  }
};

export const generatePersonaImage = async (prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate a high quality, realistic photo portrait of a friendly African American woman neighbor, smiling and looking helpful. She should be dressed casually in a jacket or sweater, standing near a brick house or front porch. The style should be warm and inviting, like a real photograph. ${prompt}`
          }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating persona image:", error);
    return ""; // Return empty string on failure to fail gracefully in UI
  }
};

export const generateRankImage = async (prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate a high quality 3D AI rendered cartoon character representing an Energy Saver Rank. The character should be cute, friendly, and colorful - like a cartoon mascot. The character should be shown from the front, centered, with a warm and friendly expression. Style should be 3D rendered, cute, and gamified - similar to animated cartoon characters. ${prompt}`
          }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating rank image:", error);
    return ""; // Return empty string on failure to fail gracefully in UI
  }
};

export const generateEnergyCollage = async (tip: string, baseImageBase64: string): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Using gemini-2.5-flash-image to generate a context-aware visualization
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', 
              data: baseImageBase64,
            },
          },
          {
            text: `Create an image visualizing the energy tip: "${tip}".

            Instructions:
            1. **Analyze Style**: Look at the provided input image. Understand its rendering style (e.g. blue blueprint, 3d wireframe, realistic photo, or sketch).
            2. **Determine Room**: Identify the single best room for the tip (e.g. Kitchen for microwave/cooking, Bathroom for water, Living Room for thermostat).
            3. **GENERATE NEW IMAGE**: Generate a close-up, interior view of ONLY that specific room. Do NOT show the whole house or floor plan.
            4. **Apply Style**: Ensure this new image uses the EXACT SAME visual style as the input image.
            5. **Integrate Text**: In the style of the image (e.g. as a blueprint label, a sticky note, or integrated text), clearly write the energy tip text "${tip}" inside the image near the relevant object.`,
          },
        ],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating collage:", error);
    throw error;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};