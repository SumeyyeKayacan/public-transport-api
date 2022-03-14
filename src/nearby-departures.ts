import { Client, TravelMode } from "@googlemaps/google-maps-services-js";
import createClient from "hafas-client";
import vbbProfile from "hafas-client/p/vbb";
import _ from "lodash";
import { Departure, LineStopPair, Location } from "./types";

const client = createClient(vbbProfile, "my-awesome-program");
const mapsClient = new Client({});

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
): LineStopPair[] {
  const closestLineStopPairs: LineStopPair[] = [];

  const lineIds = _.uniq(allDepartures.map((d) => d.line.id));

  console.log(lineIds);
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
      stop: closestLineStop,
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

  let closestLineStops = getClosestLineStopPairs(allDepartures, userLocation);

  const closestLinePromises = closestLineStops.map(async (lineStopPair) => {
    const directionsResponse = await mapsClient.directions({
      params: {
        key: "AIzaSyB90LChhhQpdYIbBBaDjrybtvR2UKdRQbM",
        origin: { latitude, longitude },
        destination: lineStopPair.stop.location,
        mode: TravelMode.walking,
      },
    });

    const walkingDuration =
      directionsResponse.data.routes[0].legs[0].duration.value;

    return { ...lineStopPair, walkingDuration };
  });

  closestLineStops = await Promise.all(closestLinePromises);

  return allDepartures
    .filter((d: Departure) =>
      closestLineStops.find(
        (lineStopPair) =>
          lineStopPair.stop.id === d.stop.id &&
          lineStopPair.lineId === d.line.id
      )
    )
    .map((d: Departure) => {
      const lineStop = closestLineStops.find(
        (lineStopPair) =>
          lineStopPair.stop.id === d.stop.id &&
          lineStopPair.lineId === d.line.id
      );
      return { ...d, walkingDuration: lineStop.walkingDuration };
    });
}
