import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup Pool",
  description: "Office World Cup prediction pool infrastructure",
};

const links = [
  ["/", "Dashboard"],
  ["/login", "Login"],
  ["/picks", "Picks"],
  ["/groups", "Groups"],
  ["/bracket", "Bracket"],
  ["/leaderboard", "Leaderboard"],
  ["/rivals", "Rivals"],
  ["/admin", "Admin"],
  ["/admin/system-check", "System Check"],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="shell">
          <header>
            <p className="muted">Office World Cup Pool</p>
            <h1>World Cup Brackets 2026</h1>
            <nav className="nav">
              {links.map(([href, label]) => (
                <Link href={href} key={href}>
                  {label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
