/**
 * Lazy-loaded calculator dataset so non-calculator requests avoid parsing the
 * full bundle at cold start.
 */
import type { calculatorData as CalculatorData } from "./calculator-data";

type Data = typeof CalculatorData;

let dataPromise: Promise<Data> | null = null;
let indiaCityIds: Set<string> | null = null;
let indiaHotelIds: Set<string> | null = null;
let indiaCompareHotelIds: Set<string> | null = null;

export async function getCalculatorData(): Promise<Data> {
  if (!dataPromise) dataPromise = import("./calculator-data").then((mod) => mod.calculatorData);
  return dataPromise;
}

export async function getIndiaCityIds(): Promise<Set<string>> {
  if (indiaCityIds) return indiaCityIds;
  indiaCityIds = new Set([
    "8", "28", "70", "32", "31", "69", "34", "23", "17", "40", "67", "13", "18", "46", "15", "4",
    "7", "36", "43", "44", "27", "47", "5", "9", "12", "6", "71", "55", "24", "51", "21", "56",
    "72", "19", "25", "20", "68", "73", "1", "26", "10", "2", "16", "30", "35", "33", "11",
    "42", "14", "29", "22", "3", "41",
  ]);
  return indiaCityIds;
}

export async function getIndiaHotelIds(): Promise<Set<string>> {
  if (indiaHotelIds) return indiaHotelIds;
  const data = await getCalculatorData();
  const cities = await getIndiaCityIds();
  indiaHotelIds = new Set(
    Object.entries(data.hotelsByCity)
      .filter(([cityId]) => cities.has(String(cityId)))
      .flatMap(([, hotels]) => hotels.map((hotel) => String(hotel.id))),
  );
  return indiaHotelIds;
}

export async function getIndiaCompareHotelIds(): Promise<Set<string>> {
  if (indiaCompareHotelIds) return indiaCompareHotelIds;
  const data = await getCalculatorData();
  const cities = await getIndiaCityIds();
  indiaCompareHotelIds = new Set(
    Object.entries(data.compareHotelsByCity)
      .filter(([cityId]) => cities.has(String(cityId)))
      .flatMap(([, hotels]) => hotels.map((hotel) => String(hotel.id))),
  );
  return indiaCompareHotelIds;
}
