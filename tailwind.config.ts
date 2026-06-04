import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#030714",
          900: "#071025",
          850: "#0a1530",
          800: "#0d1b3a",
        },
        electric: {
          DEFAULT: "#5b6cff",
          foreground: "#f7f8ff",
        },
        trophy: {
          gold: "#d8ad4c",
          muted: "#8f7541",
        },
        pitch: {
          green: "#8bd86f",
        },
        live: {
          red: "#ff4d5f",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "stadium-sweep": {
          "0%, 100%": { opacity: "0.28", transform: "translate3d(-8%, -4%, 0) rotate(-8deg)" },
          "50%": { opacity: "0.52", transform: "translate3d(8%, 4%, 0) rotate(7deg)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "rank-pop": {
          "0%": { transform: "translateY(8px) scale(0.96)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
      },
      animation: {
        "stadium-sweep": "stadium-sweep 14s ease-in-out infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "rank-pop": "rank-pop 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
};

export default config;
