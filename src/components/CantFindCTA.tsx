import { MessageCircle, Search } from "lucide-react";

interface Props {
  /** Optional context appended to the WhatsApp prefilled message, e.g. "Premier League" or "Morocco". */
  context?: string;
}

/**
 * "Didn't find what you're looking for?" call-to-action.
 *
 * Designed to live at the bottom of any product-listing page (team, league,
 * products, search) so customers always have an obvious path to message us
 * even when our catalogue doesn't carry the exact kit they want.
 */
export default function CantFindCTA({ context }: Props) {
  const text = context
    ? `Hi! I'm looking for a ${context} kit I couldn't find on the site. Can you help?`
    : "Hi! I'm looking for a kit I couldn't find on the site. Can you help?";
  const href = `https://wa.me/212628552405?text=${encodeURIComponent(text)}`;

  return (
    <section className="mt-12 mb-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a3d2a] via-[#15573b] to-[#0a3d2a] border border-emerald-500/20 px-6 py-10 sm:px-10 sm:py-12 text-center">
        {/* subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20 mb-4">
            <Search className="w-6 h-6 text-emerald-200" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Didn't find what you're looking for?
          </h3>
          <p className="mt-3 text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            No problem — message us on WhatsApp with the team, season, size and
            name/number you want, and we'll source it for you.
          </p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold px-7 py-3.5 rounded-xl transition shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <MessageCircle className="w-5 h-5" />
            Contact us on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
