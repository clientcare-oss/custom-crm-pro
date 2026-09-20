import { resolveClientLocation } from "../shared/locationResolver";

const tests = [
  { name: "Avery Jenkins", city: "Bentonville", state: "AR", zipCode: "72712" },
  { name: "Maria Thompson", city: "Atlanta", state: "GA", zipCode: "30301" },
  { name: "Sarah Miller", city: "Anchorage", state: "AK", zipCode: "99501" },
  { name: "Leilani Kim", city: "Honolulu", state: "HI", zipCode: "96813" },
  { name: "State only (CO)", city: null, state: "CO", zipCode: null },
  { name: "Missing location", city: null, state: null, zipCode: null },
];

tests.forEach((t) => {
  const res = resolveClientLocation(t);
  console.log(
    `${t.name} -> Accuracy: "${res.locationAccuracy}" | Label: "${res.accuracyLabel}" | TZ: ${res.timeZone} | Map: (${res.mapX}, ${res.mapY}) | AK: ${res.isAlaska} | HI: ${res.isHawaii}`
  );
});
