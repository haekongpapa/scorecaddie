import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1F4D2C",
        moss: "#6FA167",
        accent: "#D99A3C",
        "card-bg": "#F2F6F2",
        "card-bg2": "#E9F0E9",
        muted: "#667066",
        ink: "#1F2A24",
        line: "#DDE5DD",
      },
    },
  },
  plugins: [],
};
export default config;
