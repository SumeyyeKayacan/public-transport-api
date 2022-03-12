import createClient from "hafas-client";
import vbbProfile from "hafas-client/p/vbb";
import _ from "lodash";
import { Departure, Location } from "./types";

const client = createClient(vbbProfile, "my-awesome-program");

async function getNearByStops(
  { latitude, longitude }: Location,
  distance: number
) {
  const stops = await client.nearby(
    {
      type: "location",
      latitude,
      longitude,
    },
    { distance }
  );
  return stops;
}

async function getAllDepartures(stops: any) {
  const departures = [];

  const departuresPromises = stops.map(async (stop) =>
    getDeparturesByStation(stop.id)
  );

  const departuresArrayOfArray = await Promise.all(departuresPromises);

  departuresArrayOfArray.forEach((stationDepartures: Departure[]) => {
    departures.push(...stationDepartures);
  });

  return departures;
}

async function getDeparturesByStation(stationId: string) {
  const departures = await client.departures(stationId, { duration: 40 });
  return departures;
}

function getClosestLineStopPairs(
  allDepartures: Departure[],
  userLocation: Location
) {
  const closestLineStopPairs = [];

  const lineIds = _.uniq(allDepartures.map((d) => d.line.id));

  lineIds.forEach((lineId) => {
    const lineDepartures = allDepartures.filter((d) => d.line.id === lineId);
    const closestLineDeparture = lineDepartures.reduce(
      (closestDepartureSoFar: Departure, currentDeparture: Departure) => {
        const closestSoFarDistance = calculateDistance(
          closestDepartureSoFar.stop.location,
          userLocation
        );
        const currentDistance = calculateDistance(
          currentDeparture.stop.location,
          userLocation
        );
        return closestSoFarDistance < currentDistance
          ? closestDepartureSoFar
          : currentDeparture;
      },
      lineDepartures[0]
    );
    const closestLineStop = closestLineDeparture.stop;
    closestLineStopPairs.push({
      stopId: closestLineStop.id,
      lineId,
    });
  });

  return closestLineStopPairs;
}

function calculateDistance(location1: Location, location2: Location) {
  const diffX = location1.latitude - location2.latitude;
  const diffY = location1.longitude - location2.longitude;
  return Math.sqrt(diffX * diffX + diffY * diffY);
}

export async function getNearByDepartures(
  latitude: number,
  longitude: number,
  distance: number
) {
  const userLocation = {
    latitude,
    longitude,
  };

  const stops = await getNearByStops(userLocation, distance);

  const allDepartures = await getAllDepartures(stops);

  const closestLineStopPairs = getClosestLineStopPairs(
    allDepartures,
    userLocation
  );

  return allDepartures.filter((d: Departure) =>
    closestLineStopPairs.find(
      (lineStopPair) =>
        lineStopPair.stopId === d.stop.id && lineStopPair.lineId === d.line.id
    )
  );
}
