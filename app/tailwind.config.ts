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
      },
    },
  },
  plugins: [],
};
export default config;
