import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Quicksand", "sans-serif"],
        display: ["Quicksand", "sans-serif"],
      },
      colors: {
        cyber: {
          bg: "#070a13",
          bgSecondary: "#0d111e",
          card: "rgba(17, 24, 39, 0.7)",
          primary: "#6d28d9", // electric violet
          secondary: "#06b6d4", // electric cyan
          success: "#10b981", // emerald success
          danger: "#ef4444", // ruby red
          gold: "#f59e0b", // warm gold
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        neon: "0 0 15px rgba(109, 40, 217, 0.3)",
        "neon-green": "0 0 15px rgba(16, 185, 129, 0.3)",
        "neon-red": "0 0 15px rgba(239, 68, 68, 0.3)",
      },
    },
  },
};
