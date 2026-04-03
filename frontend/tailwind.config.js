/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        royal: "#162660",
        powder: "#D0E6FD",
        bone: "#F1E4D1",
        ink: "#14203f"
      },
      boxShadow: {
        soft: "0 24px 60px rgba(22, 38, 96, 0.12)",
        float: "0 18px 40px rgba(18, 32, 63, 0.10)"
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        display: ["'Instrument Serif'", "serif"]
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};
