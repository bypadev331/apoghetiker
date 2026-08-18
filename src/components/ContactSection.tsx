import { Phone, CalendarDays, Mail, Video } from "lucide-react";

const items = [
  {
    icon: Phone,
    title: "+49 211 5998 0",
    lines: ["Mo - Fr: 07:00 - 20:00 Uhr", "Sa: 09:00 - 16:00 Uhr"],
  },
  {
    icon: CalendarDays,
    title: "Termin vereinbaren",
    lines: ["Buchen Sie Ihren Termin - einfach, online!"],
  },
  {
    icon: Mail,
    title: "Service & Kontakt",
    lines: ["Die wichtigsten Services im Überblick"],
  },
  {
    icon: Video,
    title: "Videoberatung",
    lines: ["Mo - Fr: 08:00 - 20:00 Uhr"],
  },
];

export default function ContactSection() {
  return (
    <section className="w-full bg-[#f2f3f4] py-3 sm:py-4">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-center text-base sm:text-2xl font-medium text-[#002776] mb-3 sm:mb-5">
          Ihre apoBank. Für Sie da.
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
          {items.map((item) => (
            <div key={item.title} className="text-center">
              <item.icon
                className="mx-auto w-7 h-7 sm:w-10 sm:h-10 text-[#002776] mb-2 sm:mb-4"
                strokeWidth={1.2}
              />
              <h3 className="text-[#002776] font-semibold text-[11px] leading-tight sm:text-sm mb-1 sm:mb-2">
                {item.title}
              </h3>
              {item.lines.map((line, i) => (
                <p key={i} className="text-[11px] leading-snug sm:text-sm text-[#002776]">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
