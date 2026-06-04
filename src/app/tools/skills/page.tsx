"use client";

import Link from "next/link";
import { Book, Zap, ArrowRight } from "lucide-react";
import type { ComponentType } from "react";

interface Skill {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  category: string;
  categoryColor: string;
  description: string;
  integrations: string[];
  href: string;
}

const SKILLS: Skill[] = [];

export default function SkillsLibrary() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Book className="w-6 h-6 text-[#3c67ea]" />
          <h1 className="text-[1.375rem] leading-[1.5] font-semibold text-[#242d48]">Skills Library</h1>
          <span className="text-[0.75rem] font-medium bg-[#f0f1f7] text-[#3c67ea] px-2 py-0.5 rounded-[2px] ml-auto">
            {SKILLS.length} skills
          </span>
        </div>
        <p className="text-[0.875rem] leading-[1.2] text-[#485478]">
          Agent skill definitions — version-controlled SOUL.md, RULES.md, and skill prompts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SKILLS.map((skill) => {
          const Icon = skill.icon;
          return (
            <Link key={skill.id} href={skill.href} className="block group">
              <div className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] p-5 h-full transition-all group-hover:shadow-[0_2px_4px_rgba(36,45,72,0.15)]">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-[4px] bg-[#f0f1f7] text-[#3c67ea] flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{skill.name}</h3>
                      <span className={`text-[0.75rem] font-semibold uppercase px-1.5 py-0.5 rounded-[2px] border ${skill.categoryColor}`}>
                        {skill.category}
                      </span>
                    </div>
                    <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] leading-[1.2] mb-3">{skill.description}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-[0.75rem] text-[#485478]">
                        <Zap className="w-3 h-3 text-[#3c67ea]" />
                        5 steps
                      </span>
                      {skill.integrations.map((intg) => (
                        <span key={intg} className="text-[0.75rem] bg-[#f0f1f7] text-[#485478] px-2 py-0.5 rounded-[4px]">
                          {intg}
                        </span>
                      ))}
                      <span className="ml-auto flex items-center gap-1 text-[0.75rem] font-semibold text-[#3c67ea] opacity-0 group-hover:opacity-100 transition-opacity">
                        Launch <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
