export const sampleDeal = {
  id: "riverside-kingsport",
  player: "R. Santos",
  age: 21,
  seller: "Riverside SC",
  buyer: "Kingsport FC",
  fee: 6_000_000,
  collateralRequired: 2_000_000,
  collateralAvailable: 0,
  sellOnPercent: 10,
  status: "Must top up",
  installments: [
    { number: 1, due: "2026-10-01", amount: 2_000_000, status: "Paid by buyer" },
    { number: 2, due: "2026-11-01", amount: 2_000_000, status: "Paid from collateral" },
    { number: 3, due: "2026-12-01", amount: 2_000_000, status: "Upcoming" },
  ],
  recipients: [
    { name: "Riverside SC", role: "Seller", amount: 1_935_000 },
    { name: "Eastgate Youth", role: "Academy royalties", amount: 50_000 },
    { name: "Pine Hill Academy", role: "Academy royalties", amount: 15_000 },
  ],
} as const;

export function money(amount: number) {
  return `${new Intl.NumberFormat("en-GB").format(amount)} fEUR`;
}

export function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
