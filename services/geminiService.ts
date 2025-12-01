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
    personaTitle: { type: Type.STRING, description: "A creative, gamified title for the user based on their energy usage trend (e.g., 'The Eco-Wizard', 'The Power Pioneer')." },
    personaDescription: { type: Type.STRING, description: "A neighborly, 2-3 sentence explanation of the usage trend. It should start directly with the observation (e.g. 'I took a look at your bill...') without a greeting." },
    personaVisualPrompt: { type: Type.STRING, description: "A prompt to generate a realistic photo of a friendly African American woman neighbor giving an encouraging nod or smile. She should look like she is interacting with a neighbor. Based on the usage trend, her expression should be: Happy/Proud if usage decreased, Encouraging/Supportive if usage increased." }
  },
  required: ["customerName", "customerFirstName", "serviceAddress", "meterNumber", "accountNumber", "amountDue", "dueDate", "supplyCharges", "deliveryCharges", "energyTip", "priceToCompare", "billMonth", "amountComparisonSentence", "energyTipSentence", "monthlyComparison", "personaTitle", "personaDescription", "personaVisualPrompt"]
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
            
            LOGIC FOR PERSONA:
            Compare the 'Current 12 Months' usage or the specific month usage to the previous year.
            
            TONE: Neighborly. Observant. Friendly. Grounded. Encourages by showing what others are doing.
            - The tone feels like the kind neighbor who gives you a quiet nod of encouragement.
            - Never pushy. Never salesy.
            - Builds confidence by giving context from the community.
            
            How it sounds:
            - "I took a look at your bill and noticed a few things I see in a lot of homes around you."
            - "Many customers in your area start with this step because it feels simple and makes a real difference."
            
            Emotional goal:
            - You are not alone.
            - You are part of a capable community.
            - You can do this at your own pace.
            - PPL has your back.

            1. If usage decreased significantly (>10%): Title: "The Eco-Guardian". Description should highlight how their usage looks like other efficient homes in the area.
            2. If usage is about the same: Title: "The Steady Captain". Description should mention many neighbors also see consistent usage and start with small steps.
            3. If usage increased: Title: "The High-Voltage Hero". Description should note that they aren't the only one seeing this pattern and suggest what usually works next.
            
            IMPORTANT: The 'personaDescription' should NOT start with "HEY NEIGHBOR!". It should start directly with the neighborly observation.
            
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