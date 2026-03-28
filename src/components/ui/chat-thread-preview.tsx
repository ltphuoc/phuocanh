"use client";

import { AnimatePresence, motion } from "motion/react";
import { Paperclip, SendHorizonal } from "lucide-react";
import type { ReactElement } from "react";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";

interface ChatMessage {
  readonly body: string;
  readonly id: string;
  readonly side: "received" | "sent";
  readonly timeLabel: string;
}

const mockMessages: readonly ChatMessage[] = [
  {
    body: "I still keep thinking about the little cafe in Hoi An.",
    id: "m1",
    side: "received",
    timeLabel: "7:12 PM",
  },
  {
    body: "The lamp light made everything feel unreal. We should go back for two nights.",
    id: "m2",
    side: "sent",
    timeLabel: "7:14 PM",
  },
  {
    body: "Saving that as our next mini trip plan.",
    id: "m3",
    side: "received",
    timeLabel: "7:15 PM",
  },
  {
    body: "And I want one more photo in that yellow hallway.",
    id: "m4",
    side: "sent",
    timeLabel: "7:16 PM",
  },
] as const;

export const ChatThreadPreview = (): ReactElement => (
  <SectionCard
    className="overflow-hidden"
    hoverLift={false}
    padding="comfortable"
    surface="glass"
  >
    <div className="mb-6 flex items-center justify-between gap-3">
      <div>
        <p className="ui-meta ui-couple-mark">Future thread</p>
        <h3 className="mt-2 font-display text-[2rem] tracking-[-0.03em] text-foreground">
          Intimate, never noisy
        </h3>
      </div>
      <div className="rounded-pill border border-white/72 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
        Mock surface
      </div>
    </div>
    <PageReveal className="space-y-3" delay={0.05}>
      <AnimatePresence initial={false}>
        {mockMessages.map((message, index) => {
          const isSent = message.side === "sent";
          const previousMessage = mockMessages[index - 1];
          const addsGroupSpacing = previousMessage ? previousMessage.side !== message.side : true;

          return (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className={isSent ? "flex justify-end" : "flex justify-start"}
              initial={{ opacity: 0, y: 12 }}
              key={message.id}
              transition={{ delay: index * 0.05, duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="max-w-[78%] md:max-w-[60%]"
                style={{ marginTop: addsGroupSpacing ? "20px" : "8px" }}
              >
                <div
                  className={
                    isSent
                      ? "ui-gradient-memory rounded-[1.45rem] rounded-br-[0.7rem] border border-white/70 px-4 py-3 text-sm leading-relaxed text-foreground shadow-cloud"
                      : "rounded-[1.45rem] rounded-bl-[0.7rem] border border-white/76 bg-[rgba(255,255,255,0.76)] px-4 py-3 text-sm leading-relaxed text-foreground shadow-whisper"
                  }
                >
                  {message.body}
                </div>
                <p className="mt-2 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {message.timeLabel}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </PageReveal>
    <div className="mt-8 rounded-[1.6rem] border border-white/70 bg-[rgba(255,255,255,0.72)] px-4 py-3 shadow-whisper backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          className="inline-flex size-10 items-center justify-center rounded-full border border-white/70 bg-[rgba(255,227,225,0.84)] text-primary shadow-whisper"
          type="button"
        >
          <Paperclip aria-hidden="true" className="size-4" strokeWidth={2.1} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Write something warm, playful, or tiny.</p>
        </div>
        <button
          className="ui-gradient-active inline-flex size-11 items-center justify-center rounded-full text-primary-foreground shadow-cloud"
          type="button"
        >
          <SendHorizonal aria-hidden="true" className="size-4" strokeWidth={2.1} />
        </button>
      </div>
    </div>
  </SectionCard>
);
