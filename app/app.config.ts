export default defineAppConfig({
  ui: {
    primary: "violet",
    gray: "slate",
    button: {
      slots: {
        base: "font-semibold font-display rounded-xl transition-all duration-150 active:translate-y-[2px] active:scale-[0.98]",
      },
    },
    card: {
      slots: {
        root: "bg-[#111827] backdrop-blur-md border border-white/10 shadow-glass rounded-2xl overflow-hidden",
        body: "px-6 py-6 sm:p-6",
        header: "px-6 py-4 sm:px-6 border-b border-white/10",
        footer: "px-6 py-4 sm:px-6 border-t border-white/10",
      },
    },
    modal: {
      slots: {
        content: "bg-[#111827] border border-white/10 shadow-glass rounded-2xl",
        overlay: "bg-black/60 backdrop-blur-sm",
      },
    },
    progress: {
      slots: {
        root: "w-full flex flex-col gap-1.5",
        indicator: "flex justify-end text-xs font-medium text-gray-400",
      },
    },
    input: {
      slots: {
        base: "rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent",
      },
    },
  },
});
