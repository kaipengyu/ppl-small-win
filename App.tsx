import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import BillDisplay from './components/BillDisplay';
import { BillData } from './types';
import { analyzeBill, fileToBase64 } from './services/geminiService';

const App: React.FC = () => {
  const [billData, setBillData] = useState<BillData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setBillData(null);

    try {
      const base64 = await fileToBase64(file);
      const data = await analyzeBill(base64);
      setBillData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to process the bill. Please ensure it's a valid PDF and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setBillData(null);
    setFileName(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">
              B
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">PPL Billing AI</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section (only visible when no data) */}
        {!billData && !isLoading && (
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Understand your energy costs instantly.
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Upload your utility bill PDF. We'll use Gemini AI to extract the data, visualize your usage, and find savings tips.
            </p>
          </div>
        )}

        {/* Upload Section */}
        {!billData && (
          <div className="max-w-2xl mx-auto mb-12">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
            
            {/* Loading State */}
            {isLoading && (
              <div className="mt-8 text-center space-y-4">
                <div className="inline-block relative w-16 h-16">
                  <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-100 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-slate-600 font-medium">Analyzing PDF with Gemini...</p>
                <p className="text-sm text-slate-400">This may take a few seconds</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {billData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-sm text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Processed: <span className="font-medium text-slate-900">{fileName}</span>
               </div>
               <button 
                 onClick={reset}
                 className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
               >
                 Upload Another
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                 </svg>
               </button>
            </div>
            
            <BillDisplay data={billData} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;