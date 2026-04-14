import "./globals.css";

export const metadata = {
  title: "DSALTA Trust Center",
  description: "Dynamic trust center pages",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
