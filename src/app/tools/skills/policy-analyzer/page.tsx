"use client";

import { useState } from "react";
import { FileSearch } from "lucide-react";
import { useJourneyStream } from "@/hooks/use-journey-stream";
import { JourneyLayout, FormField, FormInput, FormSelect, SampleDataToggle } from "@/components/journey-layout";

const ENGAGEMENT_TYPES = [
  "Holistic Total Rewards",
  "Health & Welfare",
  "Retirement",
  "Compensation",
  "Workers Compensation",
];

export default function PolicyAnalyzer() {
  const { state, execute } = useJourneyStream();
  const [sampleEnabled, setSampleEnabled] = useState(false);
  const [clientName, setClientName] = useState("");
  const [engagementType, setEngagementType] = useState(ENGAGEMENT_TYPES[0]);
  const [clientIndustry, setClientIndustry] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");

  const handleSampleToggle = (enabled: boolean) => {
    setSampleEnabled(enabled);
    if (enabled) {
      setClientName("Meridian Manufacturing");
      setEngagementType("Holistic Total Rewards");
      setClientIndustry("Manufacturing");
      setDocumentNotes("SPD uploaded — 148KB, 2,847 lines");
    } else {
      setClientName(""); setEngagementType(ENGAGEMENT_TYPES[0]);
      setClientIndustry(""); setDocumentNotes("");
    }
  };

  const handleExecute = () => {
    execute("policy-analyzer", { clientName, engagementType, clientIndustry, documentNotes });
  };

  return (
    <JourneyLayout
      title="Policy Analyzer"
      subtitle="Analyze benefits policy documents and produce gap assessment"
      icon={FileSearch}
      state={state}
      onExecute={handleExecute}
      executeLabel="Analyze Policy"
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
          <FormField label="Document Notes">
            <FormInput value={documentNotes} onChange={e => setDocumentNotes(e.target.value)} placeholder="e.g. SPD uploaded — 148KB" />
          </FormField>
        </>
      }
    />
  );
}
