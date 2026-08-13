import fs from "node:fs/promises";

const originalBase = "https://www.vivahnam.com";
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

async function getJson(path) {
  const res = await fetch(`${originalBase}${path}`, {
    headers: {
      accept: "application/json,text/plain,*/*",
      "user-agent": "Codex calculator audit",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function pickCity(city) {
  return { id: Number(city.id), name: city.name };
}

function pickHotel(hotel) {
  return {
    id: Number(hotel.id),
    name: hotel.name,
    total_rooms: Number(hotel.total_rooms || 0),
  };
}

function normalizePrice(price) {
  return {
    room_price: Number(price?.room_price || 0),
    lunch_price: Number(price?.lunch_price || 0),
    hitea_price: Number(price?.hitea_price || 0),
    dinner_price: Number(price?.dinner_price || 0),
  };
}

function sortById(items) {
  return [...items].sort((a, b) => a.id - b.id);
}

function compareLists(original, local, label) {
  const diffs = [];
  const originalById = new Map(original.map((item) => [item.id, item]));
  const localById = new Map(local.map((item) => [item.id, item]));

  for (const [id, item] of originalById) {
    if (!localById.has(id)) {
      diffs.push({ type: `${label}_missing_local`, id, original: item });
      continue;
    }
    const other = localById.get(id);
    for (const key of Object.keys(item)) {
      if (item[key] !== other[key]) {
        diffs.push({
          type: `${label}_field_mismatch`,
          id,
          field: key,
          original: item[key],
          local: other[key],
        });
      }
    }
  }

  for (const [id, item] of localById) {
    if (!originalById.has(id)) {
      diffs.push({ type: `${label}_extra_local`, id, local: item });
    }
  }

  return diffs;
}

function sampleCalculation(price) {
  const rooms = 10;
  const lunch = 50;
  const hitea = 50;
  const dinner = 50;
  const subtotal =
    rooms * price.room_price +
    lunch * price.lunch_price +
    hitea * price.hitea_price +
    dinner * price.dinner_price;
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  return {
    subtotal,
    cgst,
    sgst,
    total: subtotal + cgst + sgst,
  };
}

const localData = JSON.parse(await fs.readFile("site-public/data/calculator/calculator-data.json", "utf8"));
const localCities = sortById(localData.cities.map(pickCity));
const localHotelsByCity = localData.hotelsByCity;
const localPrices = localData.prices;

const originalCitiesRaw = await getJson("/get-cities");
const originalIndiaCities = sortById(
  originalCitiesRaw.filter((city) => Number(city.country_id) === 2).map(pickCity),
);
const originalNonIndiaCities = sortById(
  originalCitiesRaw.filter((city) => Number(city.country_id) !== 2).map(pickCity),
);

const cityDiffs = compareLists(originalIndiaCities, localCities, "city");
const nonIndiaInLocal = localCities.filter((city) =>
  originalNonIndiaCities.some((foreignCity) => foreignCity.id === city.id || foreignCity.name === city.name),
);

const originalHotelsByCityEntries = await mapLimit(originalIndiaCities, 12, async (city) => {
  const hotels = sortById((await getJson(`/get-hotels-by-city/${city.id}`)).map(pickHotel));
  return [String(city.id), hotels];
});
const originalHotelsByCity = Object.fromEntries(originalHotelsByCityEntries);

const hotelDiffs = [];
for (const city of originalIndiaCities) {
  const originalHotels = originalHotelsByCity[String(city.id)] || [];
  const localHotels = sortById((localHotelsByCity[String(city.id)] || []).map(pickHotel));
  hotelDiffs.push(
    ...compareLists(originalHotels, localHotels, "hotel").map((diff) => ({
      city,
      ...diff,
    })),
  );
}

const originalHotels = Object.values(originalHotelsByCity).flat();
const localHotels = Object.values(localHotelsByCity).flat();
const priceTasks = originalHotels.flatMap((hotel) => months.map((month) => ({ hotel, month })));
const priceDiffs = [];
const sampleResultDiffs = [];

await mapLimit(priceTasks, 24, async ({ hotel, month }) => {
  const originalPrice = normalizePrice(await getJson(`/get-hotel-price/${hotel.id}/${month}`));
  const localPrice = normalizePrice(localPrices[String(hotel.id)]?.[month]);

  for (const key of Object.keys(originalPrice)) {
    if (originalPrice[key] !== localPrice[key]) {
      priceDiffs.push({
        hotel,
        month,
        field: key,
        original: originalPrice[key],
        local: localPrice[key],
      });
    }
  }

  const originalResult = sampleCalculation(originalPrice);
  const localResult = sampleCalculation(localPrice);
  for (const key of Object.keys(originalResult)) {
    if (Math.abs(originalResult[key] - localResult[key]) > 0.0001) {
      sampleResultDiffs.push({
        hotel,
        month,
        field: key,
        original: originalResult[key],
        local: localResult[key],
      });
    }
  }
});

const report = {
  checkedAt: new Date().toISOString(),
  originalCityCount: originalCitiesRaw.length,
  originalIndiaCityCount: originalIndiaCities.length,
  originalNonIndiaCityCount: originalNonIndiaCities.length,
  localCityCount: localCities.length,
  originalHotelCount: originalHotels.length,
  localHotelCount: localHotels.length,
  uniqueOriginalHotelCount: new Set(originalHotels.map((hotel) => hotel.id)).size,
  uniqueLocalHotelCount: new Set(localHotels.map((hotel) => hotel.id)).size,
  monthCount: months.length,
  priceChecks: priceTasks.length,
  calculationChecks: priceTasks.length,
  cityDiffCount: cityDiffs.length,
  hotelDiffCount: hotelDiffs.length,
  priceDiffCount: priceDiffs.length,
  sampleResultDiffCount: sampleResultDiffs.length,
  nonIndiaInLocal,
  removedNonIndiaCities: originalNonIndiaCities.map((city) => city.name),
  cityDiffs: cityDiffs.slice(0, 50),
  hotelDiffs: hotelDiffs.slice(0, 50),
  priceDiffs: priceDiffs.slice(0, 50),
  sampleResultDiffs: sampleResultDiffs.slice(0, 50),
};

await fs.writeFile("tmp/homepage-calculator-data-audit-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
