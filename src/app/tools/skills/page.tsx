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
          <Book className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Skills Library</h1>
          <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">
            {SKILLS.length} skills
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Agent skill definitions — version-controlled SOUL.md, RULES.md, and skill prompts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SKILLS.map((skill) => {
          const Icon = skill.icon;
          return (
            <Link key={skill.id} href={skill.href} className="block group">
              <div className="glass-card rounded-xl p-5 h-full transition-all group-hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{skill.name}</h3>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${skill.categoryColor}`}>
                        {skill.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{skill.description}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        <Zap className="w-3 h-3 text-primary/40" />
                        5 steps
                      </span>
                      {skill.integrations.map((intg) => (
                        <span key={intg} className="text-[10px] bg-black/[0.04] text-muted-foreground px-2 py-0.5 rounded-lg">
                          {intg}
                        </span>
                      ))}
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
