import {
  Gauge,
  Goal,
  Grid3X3,
  Network,
  Shield,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/picks", label: "Picks", icon: Goal },
  { href: "/groups", label: "Groups", icon: Grid3X3 },
  { href: "/bracket", label: "Bracket", icon: Network },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/rivals", label: "Rivals", icon: Swords },
  { href: "/profile/setup", label: "Profile", icon: Users },
  { href: "/admin", label: "Admin", icon: Shield },
];
