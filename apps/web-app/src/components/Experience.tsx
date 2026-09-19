import { motion } from "motion/react";
import { Calendar } from "lucide-react";

import { SectionHeader } from "./SectionHeader";

export const Experience = () => {
  const experiences = [
    {
      company: "Tendren",
      roles: [
        {
          title: "DevOps Engineer",
          period: "2026 - Present",
          description: "Building and security hardening Tendren's cloud infrastructure that supports the Ezyst platform for Australia and New Zealand. Streamlining the team's agentic workflows in Claude Code by increasing cognitive offloading without sacrificing quality of output.",
          tags: ["AWS", "Terraform", "GitHub Actions", "K8s", "Argo CD", "Helm", "Docker", "Claude Code"]
        }
      ]
    },
    {
      company: "Cartology",
      roles: [
        {
          title: "Site Reliability Engineer",
          period: "2024 - 2026",
          description: "Tackled operations head on for a large-scale fleet of Linux machines; automated away toil, investigated root causes, and adapted smoothly to changing technical and business requirements.",
          tags: ["GCP", "Terraform", "Salt", "GitHub Actions", "K8s", "Argo CD", "Helm", "Docker", "Splunk", "Go"]
        },
        {
          title: "Linux SysAdmin",
          period: "2023 - 2024",
          description: "Advanced monitoring and alerting capabilities for the remote fleet while serving as the primary technical escalation point for field technicians.",
          tags: ["Salt", "Docker", "Prometheus", "Grafana", "Python", "Bash"]
        }
      ]
    },
    {
      company: "RWDI Australia",
      roles: [
        {
          title: "Systems Engineer",
          period: "2020 - 2023",
          description: "Owned the end-to-end lifecycle of our fleet of environmental monitors; developed, deployed, and maintained reliable cloud systems to ensure continuous operations.",  
          tags: ["Python", "C++", "PHP", "MySQL"]
        }
      ]
    },
    {
      company: "Orion Fire Engineering",
      roles: [
        {
          title: "Mechatronic Engineer",
          period: "2018 - 2020",
          description: "Developing and maintaining the software driving next generation washdown monitors, executing deployments on PLCs and Linux SBCs.",
          tags: ["Python", "C++", "Industrial communication protocols"]
        }
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 70,
        damping: 15
      }
    }
  };

  return (
    <section className="pt-20 pb-16 px-6 bg-white" id="experience">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Professional Sequence"
          title="Professional"
          titleMuted="Experience."
          description="A brief summary of my professional contributions in past engineering roles."
        />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-6"
        >
          {experiences.map((exp, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="bento-card group flex flex-col md:flex-row gap-8 items-start bg-slate-50/50 border-slate-100 hover:bg-white"
            >
              <div className="flex-none w-full md:w-56 mb-4 md:mb-0">
                <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-brand-primary transition-colors">
                  {exp.company}
                </h3>
              </div>

              <div className="flex-grow relative">
                {/* Vertical Timeline Connector */}
                <div className="absolute left-0 top-2 bottom-8 w-px bg-slate-200" />
                
                <div className="space-y-12">
                  {exp.roles.map((role, rIdx) => (
                    <div key={rIdx} className="relative pl-8">
                      {/* Role Connector Dot */}
                      <div className="absolute -left-[4.5px] top-2 w-2.5 h-2.5 bg-slate-200 border-2 border-white rounded-full group-hover:bg-brand-primary transition-colors" />
                      
                      <div className="flex flex-col mb-4">
                        <div className="experience-date flex items-center gap-3 text-brand-primary mb-1 text-[10px] font-mono font-black uppercase tracking-widest">
                          <Calendar className="w-3.5 h-3.5" />
                          {role.period}
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-brand-primary transition-colors">
                          {role.title}
                        </h4>
                      </div>

                      <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-2xl font-medium">
                        {role.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {role.tags.map(tag => (
                          <span key={tag} className="experience-tag text-[10px] px-2.5 py-1 rounded-lg bg-white text-slate-400 font-mono border border-slate-100 shadow-xs hover:border-brand-primary/20 hover:text-brand-primary transition-colors uppercase font-bold tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
