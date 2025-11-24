export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  humidity: number;
}

export interface WeatherData {
  forecasts: WeatherForecast[];
  summary: string;
  energyImpact: string;
  tip: string;
}

// Geocode address to get coordinates
const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number }> => {
  try {
    // Using OpenWeatherMap Geocoding API
    // @ts-ignore - Vite environment variables
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY || (typeof process !== 'undefined' && process.env?.WEATHER_API_KEY);
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(address)}&limit=1&appid=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    if (data.length === 0) {
      throw new Error('Address not found');
    }
    
    return { lat: data[0].lat, lon: data[0].lon };
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback to a default location (Allentown, PA - PPL service area)
    return { lat: 40.6084, lon: -75.4902 };
  }
};

// Fetch weather forecast for next 7 days
export const fetchWeatherForecast = async (address: string): Promise<WeatherData> => {
  try {
    // @ts-ignore - Vite environment variables
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY || (typeof process !== 'undefined' && process.env?.WEATHER_API_KEY);
    
    if (!apiKey) {
      throw new Error('Weather API key not found');
    }

    // First, geocode the address
    const { lat, lon } = await geocodeAddress(address);

    // Fetch 7-day forecast from OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();
    
    // Process forecast data - group by day and get daily high/low
    const dailyForecasts: { [key: string]: { temps: number[]; conditions: string[]; humidity: number[] } } = {};
    
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyForecasts[dateKey]) {
        dailyForecasts[dateKey] = { temps: [], conditions: [], humidity: [] };
      }
      
      dailyForecasts[dateKey].temps.push(item.main.temp);
      dailyForecasts[dateKey].conditions.push(item.weather[0].main);
      dailyForecasts[dateKey].humidity.push(item.main.humidity);
    });

    // Convert to WeatherForecast array (next 7 days)
    const forecasts: WeatherForecast[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Get all available forecast dates sorted
    const availableDates = Object.keys(dailyForecasts).sort();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      if (dailyForecasts[dateKey]) {
        const dayData = dailyForecasts[dateKey];
        const high = Math.max(...dayData.temps);
        const low = Math.min(...dayData.temps);
        const avgHumidity = dayData.humidity.reduce((a, b) => a + b, 0) / dayData.humidity.length;
        const mostCommonCondition = dayData.conditions.reduce((a, b, i, arr) =>
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );
        
        forecasts.push({
          date: dateKey,
          high: Math.round(high),
          low: Math.round(low),
          condition: mostCommonCondition,
          humidity: Math.round(avgHumidity)
        });
      } else if (forecasts.length > 0) {
        // If we have previous data, estimate based on trend
        const lastForecast = forecasts[forecasts.length - 1];
        forecasts.push({
          date: dateKey,
          high: lastForecast.high,
          low: lastForecast.low,
          condition: lastForecast.condition,
          humidity: lastForecast.humidity
        });
      } else if (availableDates.length > 0) {
        // Use the first available forecast as fallback
        const firstDate = availableDates[0];
        const dayData = dailyForecasts[firstDate];
        const high = Math.max(...dayData.temps);
        const low = Math.min(...dayData.temps);
        const avgHumidity = dayData.humidity.reduce((a, b) => a + b, 0) / dayData.humidity.length;
        const mostCommonCondition = dayData.conditions.reduce((a, b, i, arr) =>
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );
        
        forecasts.push({
          date: dateKey,
          high: Math.round(high),
          low: Math.round(low),
          condition: mostCommonCondition,
          humidity: Math.round(avgHumidity)
        });
      }
    }

    // Generate summary and energy impact analysis
    const avgHigh = forecasts.reduce((sum, f) => sum + f.high, 0) / forecasts.length;
    const avgLow = forecasts.reduce((sum, f) => sum + f.low, 0) / forecasts.length;
    const avgTemp = (avgHigh + avgLow) / 2;
    
    let summary = `The next week shows average temperatures of ${Math.round(avgHigh)}°F high and ${Math.round(avgLow)}°F low.`;
    let energyImpact = '';
    let tip = '';

    // Determine energy impact based on temperature
    if (avgTemp > 75) {
      energyImpact = `With temperatures averaging above 75°F, you can expect increased cooling costs. Air conditioning usage typically increases by 15-25% during hot weather periods.`;
      tip = 'Set your thermostat to 78°F when home and 85°F when away to reduce cooling costs. Consider using ceiling fans to feel 4-6°F cooler.';
    } else if (avgTemp < 50) {
      energyImpact = `With temperatures averaging below 50°F, heating costs will be higher. Electric heating usage can increase by 20-30% during cold snaps.`;
      tip = 'Seal drafts around windows and doors to prevent heat loss. Lower your thermostat by 7-10°F when sleeping or away to save up to 10% on heating costs.';
    } else {
      energyImpact = `Moderate temperatures this week mean lower heating and cooling demands. This is an ideal time for energy-efficient operation.`;
      tip = 'Take advantage of mild weather by opening windows for natural ventilation instead of using HVAC systems.';
    }

    return {
      forecasts,
      summary,
      energyImpact,
      tip
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    // Return mock data on error
    return {
      forecasts: [],
      summary: 'Unable to fetch weather data at this time.',
      energyImpact: 'Weather data is needed to analyze energy impact.',
      tip: 'Check back later for weather-based energy tips.'
    };
  }
};

