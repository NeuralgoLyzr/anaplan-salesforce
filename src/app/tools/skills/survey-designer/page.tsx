"use client";

import { useState, useEffect } from "react";
import { ClipboardList } from "lucide-react";
import { useJourneyStream } from "@/hooks/use-journey-stream";
import { JourneyLayout, FormField, FormInput, FormSelect, CheckboxGroup, SampleDataToggle } from "@/components/journey-layout";
import { SAMPLE_INPUTS, loadSampleOutput } from "@/lib/sample-data";

const ENGAGEMENT_TYPES = [
  "Holistic Total Rewards",
  "Health & Welfare",
  "Retirement",
  "Compensation",
  "Workers Compensation",
  "Voluntary Benefits",
];

const PRIORITY_OPTIONS = [
  "Medical Plans",
  "Mental Health",
  "Retirement/401(k)",
  "PTO & Leave",
  "Wellness Programs",
  "Dental & Vision",
  "Life & Disability",
  "Compensation",
  "Voluntary Benefits",
  "Remote/Hybrid Work",
  "Financial Wellness",
  "Tuition/Student Loans",
];

export default function SurveyDesigner() {
  const { state, execute, loadSampleData } = useJourneyStream();
  const [sampleEnabled, setSampleEnabled] = useState(false);
  const [clientName, setClientName] = useState("");
  const [engagementType, setEngagementType] = useState(ENGAGEMENT_TYPES[0]);
  const [clientIndustry, setClientIndustry] = useState("");
  const [clientHeadcount, setClientHeadcount] = useState("");
  const [surveyLength, setSurveyLength] = useState("standard");
  const [workforceNotes, setWorkforceNotes] = useState("");
  const [priorityAreas, setPriorityAreas] = useState<string[]>([]);

  const applySampleData = async () => {
    setSampleEnabled(true);
    const sample = SAMPLE_INPUTS["survey-designer"];
    setClientName(sample.clientName);
    setEngagementType(sample.engagementType);
    setClientIndustry(sample.clientIndustry);
    setClientHeadcount(sample.clientHeadcount);
    setSurveyLength(sample.surveyLength);
    setWorkforceNotes(sample.workforceNotes);
    setPriorityAreas(sample.priorityAreas);
    const { activities, output } = await loadSampleOutput("survey-designer");
    loadSampleData(activities, output);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sample") === "true") applySampleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSampleToggle = async (enabled: boolean) => {
    if (enabled) {
      await applySampleData();
    } else {
      setSampleEnabled(false);
      setClientName("");
      setEngagementType(ENGAGEMENT_TYPES[0]);
      setClientIndustry("");
      setClientHeadcount("");
      setSurveyLength("standard");
      setWorkforceNotes("");
      setPriorityAreas([]);
    }
  };

  const handleExecute = () => {
    execute("survey-designer", {
      clientName, engagementType, clientIndustry,
      clientHeadcount, surveyLength, workforceNotes, priorityAreas,
    });
  };

  return (
    <JourneyLayout
      title="Survey Designer"
      subtitle="Generate consulting-grade employee benefits surveys"
      icon={ClipboardList}
      state={state}
      onExecute={handleExecute}
      executeLabel="Generate Survey"
      executeDisabled={!clientName || !clientIndustry}
      sampleDataToggle={<SampleDataToggle enabled={sampleEnabled} onChange={handleSampleToggle} />}
      formContent={
        <>
          <FormField label="Client Name" required>
            <FormInput value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Acme Corp" />
          </FormField>
          <FormField label="Engagement Type" required>
            <FormSelect value={engagementType} onChange={e => setEngagementType(e.target.value)}>
              {ENGAGEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Client Industry" required>
            <FormInput value={clientIndustry} onChange={e => setClientIndustry(e.target.value)} placeholder="e.g. Manufacturing, Technology" />
          </FormField>
          <FormField label="Approximate Headcount">
            <FormInput value={clientHeadcount} onChange={e => setClientHeadcount(e.target.value)} placeholder="e.g. 5,000" />
          </FormField>
          <FormField label="Survey Length">
            <FormSelect value={surveyLength} onChange={e => setSurveyLength(e.target.value)}>
              <option value="pulse">Pulse (10-15 questions)</option>
              <option value="standard">Standard (25-35 questions)</option>
              <option value="comprehensive">Comprehensive (50+ questions)</option>
            </FormSelect>
          </FormField>
          <FormField label="Workforce Notes">
            <FormInput value={workforceNotes} onChange={e => setWorkforceNotes(e.target.value)} placeholder="e.g. 60% hourly, multi-site, aging workforce" />
          </FormField>
          <FormField label="Priority Areas to Probe">
            <CheckboxGroup options={PRIORITY_OPTIONS} selected={priorityAreas} onChange={setPriorityAreas} />
          </FormField>
        </>
      }
    />
  );
}
