
import React, { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Info,
  MapPin,
  Users,
  Paperclip,
  History
} from 'lucide-react';
import { ActivityCase } from '../types';
import { activityService, ActivityType } from '../services/activityService';

interface WizardProps {
  onComplete: () => void;
  baseCase?: ActivityCase | null;
}

export const ActivityWizard: React.FC<WizardProps> = ({ onComplete, baseCase }) => {
  const { t, translate } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [activityTypeId, setActivityTypeId] = useState(baseCase?.activityTypeId || '');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitForApproval, setSubmitForApproval] = useState(true);
  const [formData, setFormData] = useState({
    title: baseCase?.title || '',
    description: baseCase?.description || '',
    startTime: baseCase?.startTime || '',
    endTime: baseCase?.endTime || '',
    location: baseCase?.location || '14F Briefing Room',
    maxParticipants: 30,
    managers: baseCase?.members || [],
  });
  const [managers, setManagers] = useState<string[]>(formData.managers);

  const STEPS = [
    { id: 'info', title: t.wizard.steps.basicInfo, icon: Info },
    { id: 'location', title: t.wizard.steps.timeAndVenue, icon: MapPin },
    { id: 'members', title: t.wizard.steps.team, icon: Users },
    { id: 'attachments', title: t.wizard.steps.attachments, icon: Paperclip },
  ];

  const next = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const back = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const managerOptions = [
    { id: 'user-1', name: 'Jane User', role: 'Activity Manager' },
    { id: 'user-2', name: 'Alex Admin', role: 'Policy Admin' },
    { id: 'user-3', name: 'Taylor Lee', role: 'Operations Lead' },
  ];

  const toggleManager = (id: string) => {
    setManagers(prev => {
      if (prev.includes(id)) {
        const nextManagers = prev.filter(managerId => managerId !== id);
        setFormData(current => ({ ...current, managers: nextManagers }));
        return nextManagers;
      }
      const nextManagers = [...prev, id];
      setFormData(current => ({ ...current, managers: nextManagers }));
      return nextManagers;
    });
  };

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await activityService.listTypes();
        setActivityTypes(types);
        if (!activityTypeId && types.length > 0) {
          setActivityTypeId(types[0].id);
        }
      } catch (error: any) {
        setSubmitError(error?.response?.data?.detail || 'Unable to load activity types.');
      }
    };
    loadTypes();
  }, []);

  const handleSubmit = async () => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      if (!activityTypeId) {
        throw new Error('Activity type is required.');
      }
      if (!formData.title || formData.title.trim().length < 5) {
        throw new Error('Title must be at least 5 characters.');
      }
      if (!formData.description || formData.description.trim().length < 10) {
        throw new Error('Description must be at least 10 characters.');
      }
      if (!formData.startTime || !formData.endTime) {
        throw new Error('Start and end time are required.');
      }
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endTime);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('Invalid date format.');
      }
      if (endDate <= startDate) {
        throw new Error('End time must be after start time.');
      }
      const created = await activityService.create({
        title: formData.title,
        description: formData.description,
        activity_type_id: activityTypeId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: formData.location,
        max_participants: formData.maxParticipants,
      });
      if (submitForApproval) {
        await activityService.submit(created.id);
      }
      onComplete();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (Array.isArray(detail)) {
        const message = detail
          .map((item) => {
            const path = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : 'field';
            return `${path}: ${item.msg}`;
          })
          .join(' | ');
        setSubmitError(message || 'Unable to create activity.');
      } else {
        setSubmitError(detail || error?.message || 'Unable to create activity.');
      }
    } finally {
      setIsSubmitting(false);
    }
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
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.activity.category || 'Activity Type'}</label>
                  <select
                    value={activityTypeId}
                    onChange={(e) => setActivityTypeId(e.target.value)}
                    className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  >
                    {activityTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
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

          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold border-b pb-4">{t.wizard.steps.timeAndVenue}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.activity.startTime}</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.activity.endTime}</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.activity.location}</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="14F Briefing Room">14F Briefing Room</option>
                    <option value="15F Briefing Room">15F Briefing Room</option>
                    <option value="1F Auditorium">1F Auditorium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.activity.maxParticipants || 'Max Participants'}</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: Number(e.target.value) })}
                    className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold border-b pb-4">{t.activity.members}</h3>
              <p className="text-sm text-slate-500">Selected managers can edit activity details and display the QR code.</p>
              <div className="space-y-3">
                {managerOptions.map(manager => (
                  <label key={manager.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900">{manager.name}</div>
                      <div className="text-xs text-slate-500">{manager.role} • {manager.id}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={managers.includes(manager.id)}
                      onChange={() => toggleManager(manager.id)}
                      className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep !== 0 && currentStep !== 1 && currentStep !== 2 && (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                <div className="bg-slate-50 p-6 rounded-full mb-4"><Info size={32} className="opacity-20" /></div>
                <p>{translate('wizard.standardFieldsPlaceholder', { step: STEPS[currentStep].title })}</p>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between">
          <button onClick={back} disabled={currentStep === 0} className="px-6 py-2.5 rounded-lg border text-slate-600 disabled:opacity-30 font-bold">{t.common.previous}</button>
          <div className="flex items-center space-x-4">
            {currentStep === STEPS.length - 1 && (
              <label className="flex items-center space-x-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={submitForApproval}
                  onChange={(event) => setSubmitForApproval(event.target.checked)}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                />
                <span>{t.wizard.submitForApproval}</span>
              </label>
            )}
            <button
              onClick={currentStep === STEPS.length - 1 ? handleSubmit : next}
              className="px-8 py-2.5 rounded-lg bg-blue-600 text-white shadow-md font-bold disabled:opacity-60"
              disabled={isSubmitting}
            >
              {currentStep === STEPS.length - 1 ? (isSubmitting ? t.common.loading || 'Submitting...' : t.wizard.submitCase) : t.wizard.nextStep}
            </button>
          </div>
        </div>
        {submitError && (
          <div className="px-6 pb-6 text-sm text-rose-600">{submitError}</div>
        )}
      </div>
    </div>
  );
};
