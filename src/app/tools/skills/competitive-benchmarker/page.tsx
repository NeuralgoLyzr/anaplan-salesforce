"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { useJourneyStream } from "@/hooks/use-journey-stream";
import { JourneyLayout, FormField, FormInput, FormSelect, SampleDataToggle } from "@/components/journey-layout";

const INDUSTRIES = ["Manufacturing", "Technology", "Financial Services", "Healthcare", "Retail", "Energy", "Food & Beverage"];

export default function CompetitiveBenchmarker() {
  const { state, execute } = useJourneyStream();
  const [sampleEnabled, setSampleEnabled] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientIndustry, setClientIndustry] = useState(INDUSTRIES[0]);
  const [headcount, setHeadcount] = useState("");
  const [competitors, setCompetitors] = useState("");

  const handleSampleToggle = (enabled: boolean) => {
    setSampleEnabled(enabled);
    if (enabled) {
      setClientName("Meridian Manufacturing");
      setClientIndustry("Manufacturing");
      setHeadcount("14,800");
      setCompetitors("Parker Hannifin, Emerson Electric, Rockwell Automation");
    } else {
      setClientName(""); setClientIndustry(INDUSTRIES[0]);
      setHeadcount(""); setCompetitors("");
    }
  };

  const handleExecute = () => {
    execute("competitive-benchmarker", { clientName, clientIndustry, headcount, competitors });
  };

  return (
    <JourneyLayout
      title="Competitive Benchmarker"
      subtitle="Research competitor benefits and build market position matrix"
      icon={BarChart3}
      state={state}
      onExecute={handleExecute}
      executeLabel="Run Benchmarking"
      executeDisabled={!clientName}
      sampleDataToggle={<SampleDataToggle enabled={sampleEnabled} onChange={handleSampleToggle} />}
      formContent={
        <>
          <FormField label="Client Name" required>
            <FormInput value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Acme Corp" />
          </FormField>
          <FormField label="Client Industry" required>
            <FormSelect value={clientIndustry} onChange={e => setClientIndustry(e.target.value)}>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Approximate Headcount">
            <FormInput value={headcount} onChange={e => setHeadcount(e.target.value)} placeholder="e.g. 5,000" />
          </FormField>
          <FormField label="Known Competitors">
            <FormInput value={competitors} onChange={e => setCompetitors(e.target.value)} placeholder="e.g. Company A, Company B (optional)" />
          </FormField>
        </>
      }
    />
  );
}
