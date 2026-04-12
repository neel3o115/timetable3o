import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";

import { TimetableGrid } from "@/components/TimetableGrid";
import { apiFetch } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";

const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type SharedSlot = { id: string; start: string; end: string };
type SharedSection = { id: string; name: string };
type SharedTimetable = {
  id: string;
  name: string;
  days: string[];
  slots: SharedSlot[];
  sections: SharedSection[];
  timetable: any[];
  grid?: any;
};

function formatSlot(slot: SharedSlot) {
  return `${slot.start}-${slot.end}`;
}

export default function SharedView() {
  const [, params] = useRoute("/t/:id");
  const shareId = params?.id;
  const [data, setData] = useState<SharedTimetable | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  useDocumentTitle(data?.name || "Timetable");

  useEffect(() => {
    if (!shareId) return;
    setIsLoading(true);
    apiFetch<SharedTimetable>(`/timetable/${shareId}`)
      .then((response) => setData(response))
      .finally(() => setIsLoading(false));
  }, [shareId]);

  useEffect(() => {
    if (!data) return;
    setVisibleSections((current) => {
      if (current.length === 0) return data.sections.map((section) => section.id);
      const nextIds = data.sections.map((section) => section.id);
      const filtered = current.filter((sectionId) => nextIds.includes(sectionId));
      return filtered.length === 0 ? nextIds : filtered;
    });
  }, [data]);

  const slotLabels = useMemo(
    () => Object.fromEntries((data?.slots || []).map((slot) => [slot.id, formatSlot(slot)])),
    [data?.slots]
  );

  const allSectionsVisible = !data || visibleSections.length === data.sections.length;

  const toggleAllSections = () => {
    if (!data) return;
    setVisibleSections((current) =>
      current.length === data.sections.length
        ? []
        : data.sections.map((section) => section.id)
    );
  };

  const toggleVisibleSection = (sectionId: string) => {
    if (!data) return;
    setVisibleSections((current) => {
      return current.includes(sectionId)
        ? current.filter((value) => value !== sectionId)
        : [...current, sectionId];
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading timetable...</div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Timetable not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="border-b border-border bg-white px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl">{data.name}</h1>
          <p className="text-sm text-muted-foreground">Shared timetable view. Filtering is available, editing is disabled.</p>
        </div>
      </header>

      <main className="p-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-white p-5 shadow-sm h-fit">
            <h2 className="font-semibold text-lg">Visible sections</h2>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={allSectionsVisible} onChange={toggleAllSections} />
              All Sections
            </label>
            <div className="mt-3 space-y-2">
              {data.sections.map((section) => (
                <label key={section.id} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={visibleSections.includes(section.id)}
                    onChange={() => toggleVisibleSection(section.id)}
                  />
                  {section.name}
                </label>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm min-h-[640px]">
            <TimetableGrid
              data={data.grid || data.timetable}
              days={data.days || DAY_OPTIONS}
              timeSlots={(data.slots || []).map((slot) => slot.id)}
              slotLabels={slotLabels}
              sections={data.sections}
              visibleSectionIds={visibleSections}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
