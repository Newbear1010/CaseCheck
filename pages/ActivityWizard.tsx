
import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Info, 
  MapPin, 
  ShieldAlert, 
  Users, 
  Paperclip,
  Sparkles
} from 'lucide-react';

const STEPS = [
  { id: 'info', title: 'Basic Info', icon: Info },
  { id: 'location', title: 'Time & Venue', icon: MapPin },
  { id: 'risk', title: 'Risk & Policies', icon: ShieldAlert },
  { id: 'members', title: 'Team', icon: Users },
  { id: 'attachments', title: 'Attachments', icon: Paperclip },
];

export const ActivityWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const next = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const back = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const runAiAnalysis = () => {
    setIsAiAnalyzing(true);
    setTimeout(() => setIsAiAnalyzing(false), 2000); // Simulate AI logic
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Create New Case</h1>
        <p className="text-slate-500">Initiate a structured activity case for governance and tracking.</p>
      </div>

      {/* Stepper Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 flex justify-between overflow-x-auto no-scrollbar">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          
          return (
            <div key={step.id} className="flex items-center space-x-2 px-4 shrink-0">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-colors
                ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}
              `}>
                {isDone ? <CheckCircle2 size={20} /> : <Icon size={20} />}
              </div>
              <div className={`text-sm font-semibold whitespace-nowrap ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.title}
              </div>
              {idx < STEPS.length - 1 && <ChevronRight size={16} className="text-slate-300" />}
            </div>
          );
        })}
      </div>

      {/* Form Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
        <div className="p-8 flex-1">
          {currentStep === 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold border-b pb-4">Activity Definition</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Case Title</label>
                  <input type="text" placeholder="e.g., Annual Board Meeting 2024" className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Scope & Purpose</label>
                  <textarea rows={4} placeholder="Describe the objectives and business impact..." className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 text-center py-12">
              <MapPin size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-bold">Venue & Scheduling</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Select a venue. The system will automatically check for conflicts against existing policies and other cases.</p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <input type="datetime-local" className="border-slate-200 rounded-lg p-2.5" />
                <input type="datetime-local" className="border-slate-200 rounded-lg p-2.5" />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-bold">Risk Assessment</h3>
                <button 
                  onClick={runAiAnalysis}
                  disabled={isAiAnalyzing}
                  className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{isAiAnalyzing ? 'Analyzing...' : 'AI Risk Analysis'}</span>
                </button>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                <div className="flex items-start space-x-3">
                  <input type="checkbox" className="mt-1 rounded text-blue-600" />
                  <div>
                    <p className="text-sm font-bold">Requires External Guests</p>
                    <p className="text-xs text-slate-500">Checking this triggers a "Guest Policy Check" during approval.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <input type="checkbox" className="mt-1 rounded text-blue-600" />
                  <div>
                    <p className="text-sm font-bold">High Data Sensitivity</p>
                    <p className="text-xs text-slate-500">Activity involves confidential corporate roadmap discussions.</p>
                  </div>
                </div>
              </div>
              {isAiAnalyzing && (
                <div className="animate-pulse flex items-center space-x-3 text-indigo-600">
                  <div className="w-4 h-4 bg-indigo-600 rounded-full"></div>
                  <span className="text-sm font-medium">Policy Engine evaluating risk factors...</span>
                </div>
              )}
            </div>
          )}

          {currentStep > 2 && (
             <div className="flex items-center justify-center h-full text-slate-400">
                Remaining steps content would go here...
             </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-6 border-t border-slate-100 flex justify-between">
          <button 
            onClick={back} 
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 font-bold transition-all"
          >
            <ChevronLeft size={20} />
            <span>Previous</span>
          </button>
          
          {currentStep === STEPS.length - 1 ? (
            <button 
              onClick={onComplete}
              className="flex items-center space-x-2 px-8 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-500 shadow-md font-bold transition-all"
            >
              <span>Submit for Approval</span>
              <CheckCircle2 size={20} />
            </button>
          ) : (
            <button 
              onClick={next}
              className="flex items-center space-x-2 px-8 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-md font-bold transition-all"
            >
              <span>Next Step</span>
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
