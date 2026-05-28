"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useJourneyStream } from "@/hooks/use-journey-stream";
import { JourneyLayout, FormField, FormInput, FormSelect, CheckboxGroup, SampleDataToggle } from "@/components/journey-layout";

const SCENARIO_OPTIONS = ["Conservative (cost-neutral)", "Moderate (5–15% spend increase)", "Aggressive (15–30% spend increase)"];
const WORKSTREAMS = ["Employee Survey completed", "Policy Assessment completed", "Competitive Benchmarking completed"];

export default function SynthesisRecommender() {
  const { state, execute } = useJourneyStream();
  const [sampleEnabled, setSampleEnabled] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientIndustry, setClientIndustry] = useState("");
  const [scenario, setScenario] = useState(SCENARIO_OPTIONS[1]);
  const [completedWorkstreams, setCompletedWorkstreams] = useState<string[]>([]);

  const handleSampleToggle = (enabled: boolean) => {
    setSampleEnabled(enabled);
    if (enabled) {
      setClientName("Meridian Manufacturing");
      setClientIndustry("Manufacturing");
      setScenario(SCENARIO_OPTIONS[1]);
      setCompletedWorkstreams(WORKSTREAMS);
    } else {
      setClientName(""); setClientIndustry("");
      setScenario(SCENARIO_OPTIONS[1]); setCompletedWorkstreams([]);
    }
  };

  const handleExecute = () => {
    execute("synthesis-recommender", { clientName, clientIndustry, scenario, completedWorkstreams });
  };

  return (
    <JourneyLayout
      title="Synthesis & Recs"
      subtitle="Combine all workstream outputs into a client-ready recommendation report"
      icon={Sparkles}
      state={state}
      onExecute={handleExecute}
      executeLabel="Generate Report"
      executeDisabled={!clientName || completedWorkstreams.length === 0}
      sampleDataToggle={<SampleDataToggle enabled={sampleEnabled} onChange={handleSampleToggle} />}
      formContent={
        <>
          <FormField label="Client Name" required>
            <FormInput value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Acme Corp" />
          </FormField>
          <FormField label="Client Industry">
            <FormInput value={clientIndustry} onChange={e => setClientIndustry(e.target.value)} placeholder="e.g. Manufacturing" />
          </FormField>
          <FormField label="Report Scenario">
            <FormSelect value={scenario} onChange={e => setScenario(e.target.value)}>
              {SCENARIO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Completed Workstreams" required>
            <CheckboxGroup options={WORKSTREAMS} selected={completedWorkstreams} onChange={setCompletedWorkstreams} />
          </FormField>
        </>
      }
    />
  );
}
