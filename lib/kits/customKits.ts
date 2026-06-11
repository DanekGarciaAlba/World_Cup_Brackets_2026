export type CustomKit = {
  id: string;
  name: string;
  countryCode: string;
  src: string;
  accent: string;
  secondary: string;
};

export const customKits = [
  {
    id: "canada",
    name: "Canada",
    countryCode: "CAN",
    src: "/assets/kits/custom/clean/canada.png",
    accent: "#d9282f",
    secondary: "#f3f6ff",
  },
  {
    id: "united-states",
    name: "United States",
    countryCode: "USA",
    src: "/assets/kits/custom/clean/united-states.png",
    accent: "#f0f3f8",
    secondary: "#243c86",
  },
  {
    id: "mexico",
    name: "Mexico",
    countryCode: "MEX",
    src: "/assets/kits/custom/clean/mexico.png",
    accent: "#08724c",
    secondary: "#cf2f38",
  },
  {
    id: "france",
    name: "France",
    countryCode: "FRA",
    src: "/assets/kits/custom/clean/france.png",
    accent: "#172d54",
    secondary: "#d4ae5a",
  },
  {
    id: "germany",
    name: "Germany",
    countryCode: "GER",
    src: "/assets/kits/custom/clean/germany.png",
    accent: "#f2f2ee",
    secondary: "#171717",
  },
  {
    id: "spain",
    name: "Spain",
    countryCode: "ESP",
    src: "/assets/kits/custom/clean/spain.png",
    accent: "#c91f27",
    secondary: "#14233d",
  },
  {
    id: "argentina",
    name: "Argentina",
    countryCode: "ARG",
    src: "/assets/kits/custom/clean/argentina.png",
    accent: "#9bd7f7",
    secondary: "#d3a54e",
  },
  {
    id: "england",
    name: "England",
    countryCode: "ENG",
    src: "/assets/kits/custom/clean/england.png",
    accent: "#f5f5f2",
    secondary: "#182b4a",
  },
  {
    id: "portugal",
    name: "Portugal",
    countryCode: "POR",
    src: "/assets/kits/custom/clean/portugal.png",
    accent: "#d53631",
    secondary: "#0b6a47",
  },
  {
    id: "south-africa",
    name: "South Africa",
    countryCode: "RSA",
    src: "/assets/kits/custom/clean/south-africa.png",
    accent: "#0c5c38",
    secondary: "#d8b157",
  },
  {
    id: "colombia",
    name: "Colombia",
    countryCode: "COL",
    src: "/assets/kits/custom/clean/colombia.png",
    accent: "#f1d526",
    secondary: "#1e67be",
  },
  {
    id: "ecuador",
    name: "Ecuador",
    countryCode: "ECU",
    src: "/assets/kits/custom/clean/ecuador.png",
    accent: "#f2d32a",
    secondary: "#14233d",
  },
  {
    id: "brazil",
    name: "Brazil",
    countryCode: "BRA",
    src: "/assets/kits/custom/clean/brazil.png",
    accent: "#f0dd38",
    secondary: "#1f68d2",
  },
] satisfies CustomKit[];

export const defaultCustomKit = customKits.find((kit) => kit.id === "france") ?? customKits[0];

export function findCustomKit(id?: string | null) {
  return customKits.find((kit) => kit.id === id) ?? defaultCustomKit;
}
