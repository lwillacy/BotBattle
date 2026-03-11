export const metadata = {
  title: "Tari Agent Arena",
  description: "Prisoner's Dilemma Game Engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
