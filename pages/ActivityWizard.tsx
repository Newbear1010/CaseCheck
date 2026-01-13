
import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Info,
  MapPin,
  ShieldAlert,
  Users,
  Paperclip,
  Sparkles,
  AlertTriangle,
  History
} from 'lucide-react';
import { analyzeActivityRisk } from '../services/aiService';
import { ActivityCase } from '../types';

interface WizardProps {
  onComplete: () => void;
  baseCase?: ActivityCase | null;
}

export const ActivityWizard: React.FC<WizardProps> = ({ onComplete, baseCase }) => {
  const { t, translate } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    title: baseCase?.title || '',
    description: baseCase?.description || ''
  });
  const [aiResult, setAiResult] = useState<any>(null);

  const STEPS = [
    { id: 'info', title: t.wizard.steps.basicInfo, icon: Info },
    { id: 'location', title: t.wizard.steps.timeAndVenue, icon: MapPin },
    { id: 'risk', title: t.wizard.steps.riskAndPolicies, icon: ShieldAlert },
    { id: 'members', title: t.wizard.steps.team, icon: Users },
    { id: 'attachments', title: t.wizard.steps.attachments, icon: Paperclip },
  ];

  const next = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const back = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const runAiAnalysis = async () => {
    if (!formData.title || !formData.description) return;
    setIsAiAnalyzing(true);
    const result = await analyzeActivityRisk(formData.title, formData.description);
    setAiResult(result);
    setIsAiAnalyzing(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {baseCase ? t.activity.newCaseFromArchive : t.activity.createNewCase}
        </h1>
        {baseCase && (
          <div className="mt-2 flex items-center space-x-2 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-full border border-blue-100">
            <History size={14} />
            <span>{t.activity.referencingRejectedCase}: {baseCase.id}</span>
          </div>
        )}
      </div>

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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
        <div className="p-8 flex-1">
          {currentStep === 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold border-b pb-4">{t.wizard.activityDefinition}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.wizard.caseTitle}</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={t.activity.titlePlaceholder}
                    className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.activity.scopeAndPurpose}</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder={t.activity.scopePlaceholder}
                    className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-bold">{t.wizard.riskAssessment}</h3>
                <button
                  onClick={runAiAnalysis}
                  disabled={isAiAnalyzing || !formData.title}
                  className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={14} className={isAiAnalyzing ? "animate-spin" : ""} />
                  <span>{isAiAnalyzing ? t.wizard.policyVerification : t.wizard.runAiAnalysis}</span>
                </button>
              </div>

              {aiResult ? (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                   <div className={`p-4 rounded-lg border flex items-start space-x-4 ${
                     aiResult.riskLevel === 'HIGH' ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'
                   }`}>
                      <div className={`p-2 rounded-full ${aiResult.riskLevel === 'HIGH' ? 'bg-rose-200 text-rose-700' : 'bg-blue-200 text-blue-700'}`}>
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{t.wizard.analysisResult}: {aiResult.riskLevel}</div>
                        <p className="text-sm text-slate-600 mt-1">{aiResult.reasoning}</p>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-xl text-slate-400">
                  <Sparkles className="mx-auto mb-4 opacity-20" size={48} />
                  <p>{t.wizard.runAnalysisPrompt}</p>
                </div>
              )}
            </div>
          )}

          {currentStep !== 0 && currentStep !== 2 && (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                <div className="bg-slate-50 p-6 rounded-full mb-4"><Info size={32} className="opacity-20" /></div>
                <p>{translate('wizard.standardFieldsPlaceholder', { step: STEPS[currentStep].title })}</p>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between">
          <button onClick={back} disabled={currentStep === 0} className="px-6 py-2.5 rounded-lg border text-slate-600 disabled:opacity-30 font-bold">{t.common.previous}</button>
          <button
            onClick={currentStep === STEPS.length - 1 ? onComplete : next}
            className="px-8 py-2.5 rounded-lg bg-blue-600 text-white shadow-md font-bold"
          >
            {currentStep === STEPS.length - 1 ? t.wizard.submitCase : t.wizard.nextStep}
          </button>
        </div>
      </div>
    </div>
  );
};
