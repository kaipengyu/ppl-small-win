<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PPL Bill Parser AI

A smart utility bill analyzer that uses Google's Gemini models to extract data, generate personalized energy personas, and provide actionable savings insights.

View your app in AI Studio: https://ai.studio/apps/drive/1XAFgpgqszYsYckj_PzgAcA5ibz7S7hIj

## How It Works

This application processes PDF utility bills using a three-stage pipeline to deliver personalized insights.

### 1. AI Bill Analysis & Persona Generation
**The Prompt:**
The application sends the PDF bill directly to **Gemini 1.5 Flash** with a prompt to extract structured data (dates, amounts, usage) and generate a "Persona" based on usage trends.

> "Compare the 'Current 12 Months' usage or the specific month usage to the previous year.
> 1. If usage decreased significantly (>10%): Assign a title like 'The Eco-Guardian'...
> 2. If usage is about the same: Assign a title like 'The Steady Captain'...
> 3. If usage increased: Assign a title like 'The High-Voltage Hero'..."

**Visual Generation:**
Once the persona is established, a second call to **Gemini 1.5 Flash** generates a 3D Pixar-style avatar representing that specific user (e.g., "A cute 3d character holding a leaf shield" for Eco-Guardians).

### 2. The Three Insight Cards
The dashboard presents three distinct cards, each deriving its content from a different source:

#### Card 1: Quick Win (Gemini Extraction)
**Source:** Direct extraction from the bill's text.
**Prompt Logic:** The Gemini schema specifically requests:
> "The 'Want to save?' energy tip text provided on the bill"
> AND "A short, friendly sentence summarizing the specific advice..."

#### Card 2: Rebate Opportunity (Deterministic Logic)
**Source:** `rebateUtils.ts` (Matches usage to PPL Rebate Database).
**Logic:**
- **Cooling Issue**: Usage > 1000 kWh + Temp > 70°F → Recommends **Premium Heat Pump**.
- **Heating Issue**: Usage > 1000 kWh + Temp < 50°F → Recommends **Heat Pump/Insulation**.
- **General High Usage**: Usage > 800 kWh → Recommends **In-Home Audit**.
- **High Bill**: Bill > $150 → Recommends **Smart Thermostat**.
- **Low Usage**: Default → Recommends **Virtual Audit**.

#### Card 3: Home Efficiency (Context Inference)
**Source:** `rebateUtils.ts` (Infers home attributes from address & usage).
**Logic:**
- **Home Age Inference**: Checks address for keywords like "Street", "Ave", "Old" (implies older infrastructure) vs "Lane"/"Court".
    - *If Older Area + High Usage:* Suggests insulation/air sealing.
    - *If Newer Area:* Suggests general maintenance.
- **Seasonal Context**: 
    - *Summer:* Suggests window coverings.
    - *Winter:* Suggests heating maintenance.

### 3. Weather Forecast & Energy Impact
**Source:** `weatherService.ts` (OpenWeatherMap API + Deterministic Logic).
**Logic:**
- **API Call:** Fetches 7-day forecast for the bill's service address.
- **Weekly Outlook Generation:**
    - Calculates the average high and low temperatures for the next 7 days.
    - **Template:** "The next week shows average temperatures of {AvgHigh}°F high and {AvgLow}°F low."
- **Weather Tip Generation:**
    - *High Temps (>75°F Avg):* "Set your thermostat to 78°F when home and 85°F when away... Consider using ceiling fans..."
    - *Low Temps (<50°F Avg):* "Seal drafts around windows and doors... Lower your thermostat by 7-10°F..."
    - *Moderate Temps:* "Take advantage of mild weather by opening windows for natural ventilation..."

---

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
