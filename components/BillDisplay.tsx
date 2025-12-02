import React, { useState, useEffect } from 'react';
import { BillData } from '../types';
import { generateEnergyCollage, generatePersonaImage, generateRankImage } from '../services/geminiService';
import { fetchWeatherForecast, WeatherData } from '../services/weatherService';
import { getBestRebate, getHouseholdTip } from '../utils/rebateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Lightbulb, DollarSign, Home, ExternalLink, CloudSun, Zap, Thermometer } from 'lucide-react';
import basePhoto from '../src/base-photo.jpg';

interface BillDisplayProps {
  data: BillData;
}

// Simulating the local file provided by user in src folder (Blue Blueprint Style)
const DEFAULT_BASE_PHOTO_URL = basePhoto;

const BillDisplay: React.FC<BillDisplayProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const [collageImage, setCollageImage] = useState<string | null>(null);
  const [personaImage, setPersonaImage] = useState<string | null>(null);
  const [rankImage, setRankImage] = useState<string | null>(null);
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  
  const jsonString = JSON.stringify(data, null, 2);
  const bestRebate = getBestRebate(data);
  const householdTip = getHouseholdTip(data);

  // Automatically generate rank image on load
  useEffect(() => {
    let mounted = true;
    const fetchRankImage = async () => {
      if (data.rankVisualPrompt) {
        const img = await generateRankImage(data.rankVisualPrompt);
        if (mounted && img) setRankImage(img);
      }
    };
    fetchRankImage();
    return () => { mounted = false; };
  }, [data.rankVisualPrompt]);

  // Automatically generate collage on load
  useEffect(() => {
    let mounted = true;
    
    const generateCollageAuto = async () => {
      setIsGeneratingCollage(true);
      try {
        const base64Base = await urlToBase64(DEFAULT_BASE_PHOTO_URL);
        const imageUrl = await generateEnergyCollage(data.energyTip, base64Base);
        if (mounted) setCollageImage(imageUrl);
      } catch (err) {
        console.error("Auto collage generation failed:", err);
        // Silently fail or keep the placeholder state if generation fails
      } finally {
        if (mounted) setIsGeneratingCollage(false);
      }
    };

    generateCollageAuto();

    return () => { mounted = false; };
  }, [data.energyTip]);

  // Fetch weather data on load
  useEffect(() => {
    let mounted = true;
    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      try {
        const weather = await fetchWeatherForecast(data.serviceAddress);
        if (mounted) setWeatherData(weather);
      } catch (err) {
        console.error("Weather fetch failed:", err);
      } finally {
        if (mounted) setIsLoadingWeather(false);
      }
    };
    fetchWeather();
    return () => { mounted = false; };
  }, [data.serviceAddress]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in space-y-8">
      {/* Energy Saver Rank Card */}
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 rounded-2xl shadow-xl overflow-hidden text-white">
        <div className="flex flex-col md:flex-row items-center p-8 gap-8">
          
          {/* Rank Badge Section with Circular Progress */}
          <div className="relative flex-shrink-0">
            {/* Circular Progress Border */}
            <svg className="w-40 h-40 md:w-48 md:h-48 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="6"
              />
              {/* Progress circle - calculate based on percentToNextLevel */}
              {data.percentToNextLevel > 0 && (() => {
                // Calculate progress percentage (inverse - more savings needed = less progress)
                // For simplicity, we'll show progress based on rank level
                const rankProgress = {
                  'Amateur': 25,
                  'Pro': 50,
                  'All-Star': 75,
                  'G.O.A.T.': 100
                };
                const progress = rankProgress[data.energySaverRank] || 0;
                const circumference = 2 * Math.PI * 45;
                const offset = circumference - (progress / 100) * circumference;
                
                return (
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.6)"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                );
              })()}
            </svg>
            
            {/* Rank Image */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-white/10 flex items-center justify-center">
                {rankImage ? (
                  <img src={rankImage} alt={data.energySaverRank} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
              </div>
            </div>
            
            {/* Status Badge with Percentage to Next Level */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ppl-orange text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider min-w-max">
              <div className="text-center">
                <div>{data.billMonth} Review</div>
                {data.percentToNextLevel > 0 && data.nextRank && (
                  <div className="text-[10px] normal-case mt-0.5 font-semibold">
                    Save another {data.percentToNextLevel.toFixed(0)}% to be {data.nextRank}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Energy Saver Rank: <span className="text-ppl-paleGreen">{data.energySaverRank}</span>
              </h2>
              <p className="text-brand-100 text-base md:text-lg leading-relaxed font-light">
                {data.rankDescription}
              </p>
            </div>

            <div className="pt-4 flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                <p className="text-xs text-brand-200 uppercase">Amount Due</p>
                <p className="font-bold text-xl">${data.amountDue}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                 <p className="text-xs text-brand-200 uppercase">Usage Change</p>
                 <p className={`font-bold text-xl ${data.monthlyComparison.usageCurrent < data.monthlyComparison.usagePrevious ? 'text-ppl-paleGreen' : 'text-ppl-lightOrange'}`}>
                   {data.monthlyComparison.usageCurrent < data.monthlyComparison.usagePrevious ? '↓' : '↑'} 
                   {Math.abs(Math.round(((data.monthlyComparison.usageCurrent - data.monthlyComparison.usagePrevious) / data.monthlyComparison.usagePrevious) * 100))}%
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Energy Tips Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Energy Tips</h3>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tip 1: Existing Energy Tip */}
          <div className="group bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl p-6 border border-brand-100 hover:shadow-md transition-all duration-200 flex flex-col">
            <div className="mb-4">
              <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-200 group-hover:scale-110 transition-transform duration-200">
                <Lightbulb className="w-6 h-6" />
              </div>
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg">Quick Win</h4>
            <p className="text-slate-600 leading-relaxed text-sm flex-grow">{data.energyTip}</p>
          </div>

          {/* Tip 2: Rebate-based Tip */}
          <a 
            href="https://pplelectricsavings.com/ppl/sites/ppl/files/2025-07/All_Res_Rebates_Flyer_July2025.pdf?_gl=1*rrwl7x*_gcl_au*MTgyMzg5NjI2NC4xNzYzNDg3NjY4*_ga*MzU3MjAwNzcwLjE3NjM0ODc2Njg.*_ga_79ZMR1DRPS*czE3NjQwMDUxMDQkbzYkZzAkdDE3NjQwMDUxMDQkajYwJGwwJGgw"
            target="_blank"
            rel="noopener noreferrer" 
            className="group bg-gradient-to-br from-ppl-paleGreen to-brand-50 rounded-xl p-6 border border-ppl-forestGreen/20 hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer relative"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
               <ExternalLink className="w-4 h-4 text-ppl-forestGreen" />
            </div>
            <div className="mb-4">
              <div className="w-12 h-12 bg-ppl-forestGreen rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200 group-hover:scale-110 transition-transform duration-200">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg group-hover:text-ppl-forestGreen transition-colors">Rebate Opportunity</h4>
            <p className="text-slate-600 leading-relaxed mb-4 text-sm">
              {bestRebate.reason}
            </p>
            <div className="mt-auto bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-ppl-forestGreen/30 group-hover:bg-white/80 transition-colors">
              <p className="text-xs text-slate-600 mb-1 font-medium">
                <span className="text-ppl-forestGreen">{bestRebate.name}</span>
              </p>
              <p className="text-sm font-bold text-slate-900">Save up to <span className="text-ppl-darkGreen">{bestRebate.amount}</span></p>
            </div>
          </a>

          {/* Tip 3: Household-based Tip */}
          <div className="group bg-gradient-to-br from-ppl-lightOrange to-orange-50 rounded-xl p-6 border border-ppl-orange/20 hover:shadow-md transition-all duration-200 flex flex-col">
            <div className="mb-4">
              <div className="w-12 h-12 bg-ppl-orange rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform duration-200">
                <Home className="w-6 h-6" />
              </div>
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg">Home Efficiency</h4>
            <p className="text-slate-600 leading-relaxed text-sm flex-grow">{householdTip}</p>
          </div>
        </div>
      </div>

      {/* Weather Forecast Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">7-Day Weather Forecast</h3>
          <p>Keep your winning streak alive with these tips tailored specifically for your local weather.</p>
        </div>

        <div className="p-6">
          {isLoadingWeather ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-slate-600">Loading weather data...</span>
            </div>
          ) : weatherData && weatherData.forecasts.length > 0 ? (
            <div className="space-y-8">
              {/* Merged Forecast Summary & Energy Impact */}
              <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-xl p-6 border border-brand-200 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-500 rounded-lg text-white shadow-md">
                     <CloudSun className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-2">Weekly Outlook</h4>
                    <p className="text-slate-700 leading-relaxed mb-3">{weatherData.summary}</p>
                    <div className="flex items-center gap-2 text-ppl-orange text-sm font-medium bg-orange-50 px-3 py-2 rounded-md border border-ppl-orange/20 inline-block">
                      <Thermometer className="w-4 h-4" />
                      {weatherData.energyImpact}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Weather Chart */}
                <div className="lg:col-span-2 p-4">
                   <h4 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Temperature Trend</h4>
                   <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weatherData.forecasts.map(f => ({
                      date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      high: f.high,
                      low: f.low
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} label={{ value: '°F', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`${value}°F`, '']}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="high" stroke="#E52207" strokeWidth={3} name="High Temp" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="low" stroke="#0071A8" strokeWidth={3} name="Low Temp" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Weather Energy Tip */}
                <div className="bg-brand-50 rounded-xl p-6 border border-brand-100 flex flex-col justify-center relative overflow-hidden h-fit">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-200 rounded-full blur-2xl opacity-50"></div>
                  <div className="relative z-10">
                    <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white mb-4 shadow-md">
                       <Zap className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">Weather Tip</h4>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {weatherData.tip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>Unable to load weather data. Please check your API key configuration.</p>
            </div>
          )}
        </div>
      </div>

      {/* Energy Tip Visualization Section - Commented Out */}
      {/*
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Visualize Your Savings</h3>
        </div>

        <div className="p-6">
          <div className="w-full bg-slate-100 rounded-lg min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden border border-slate-200 mb-4 group">
             {collageImage ? (
               <img src={collageImage} alt="Energy Savings Visualization" className="w-full h-full object-contain animate-fade-in" />
             ) : (
               <div className="text-center p-8 max-w-md w-full">
                 <div className="relative w-full h-64 rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center">
                    {isGeneratingCollage ? (
                       <div className="flex flex-col items-center gap-4">
                          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                          <p className="text-brand-600 font-medium animate-pulse">Generating visualization...</p>
                          <p className="text-xs text-slate-500">Creating a {data.energyTip.toLowerCase().includes('cooking') || data.energyTip.toLowerCase().includes('microwave') ? 'kitchen' : 'room'} view in blueprint style</p>
                       </div>
                    ) : (
                      <img src={DEFAULT_BASE_PHOTO_URL} alt="Base" className="w-full h-full object-cover opacity-50 grayscale" />
                    )}
                 </div>
               </div>
             )}
          </div>
          
          {collageImage && (
             <div className="flex justify-end">
                <a 
                  href={collageImage} 
                  download="energy-savings-plan.png"
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  Download Plan
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </a>
             </div>
          )}
        </div>
      </div>
      */}

      {/* JSON Display Section - Hidden */}
      {/*
      <div className="bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-800">
        <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-slate-400 font-mono text-xs">extracted_data.json</span>
          </div>
          <button 
            onClick={handleCopy}
            className={`
              text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-200
              ${copied 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'}
            `}
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
        <div className="relative group">
           <pre className="p-6 text-sm font-mono text-blue-100 overflow-x-auto whitespace-pre max-h-[80vh]">
            {jsonString}
          </pre>
        </div>
      </div>
      <div className="text-center text-sm text-slate-500">
        Data extracted from {data.billMonth} statement for Account {data.accountNumber}
      </div>
      */}
    </div>
  );
};

export default BillDisplay;