import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Libeen · Lead Intake",
  description: "Preparación y revisión comercial de conversaciones ficticias.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
