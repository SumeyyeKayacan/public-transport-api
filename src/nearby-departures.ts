import { Client, TravelMode } from "@googlemaps/google-maps-services-js";
import createClient from "hafas-client";
import vbbProfile from "hafas-client/p/vbb";
import _ from "lodash";
import { Departure, LineStopPair, Location } from "./types";

const hafasClient = createClient(vbbProfile, "my-awesome-program");
const googleMapsClient = new Client({});

async function getNearByStops(
  { latitude, longitude }: Location,
  distance: number
) {
  const stops = await hafasClient.nearby(
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
  const departures = await hafasClient.departures(stationId, { duration: 40 });
  return departures;
}

function getClosestLineStops(
  allDepartures: Departure[],
  userLocation: Location
): LineStopPair[] {
  const closestLineStopPairs: LineStopPair[] = [];

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
      stop: closestLineStop,
      lineId,
    });
  });

  return closestLineStopPairs;
}

async function getClosestLineStopsWithWalkingDuration(
  allDepartures: Departure[],
  userLocation: Location
): Promise<LineStopPair[]> {
  let closestLineStops = getClosestLineStops(allDepartures, userLocation);

  const closestLinePromises = closestLineStops.map(async (lineStopPair) => {
    const directionsResponse = await googleMapsClient.directions({
      params: {
        key: "AIzaSyB90LChhhQpdYIbBBaDjrybtvR2UKdRQbM",
        origin: userLocation,
        destination: lineStopPair.stop.location,
        mode: TravelMode.walking,
      },
    });

    const walkingDuration =
      directionsResponse.data.routes[0].legs[0].duration.value;

    return { ...lineStopPair, walkingDuration };
  });

  return Promise.all(closestLinePromises);
}

function filterDepartures(
  allDepartures: Departure[],
  closestLineStops: LineStopPair[]
) {
  const getClosestLineStop = (d: Departure) => {
    return closestLineStops.find(
      (lineStopPair) =>
        lineStopPair.stop.id === d.stop.id && lineStopPair.lineId === d.line.id
    );
  };

  return allDepartures
    .filter((d: Departure) => !!getClosestLineStop(d))
    .map((d: Departure) => {
      const lineStop = getClosestLineStop(d);
      return { ...d, walkingDuration: lineStop.walkingDuration };
    });
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

  const closestLineStops = await getClosestLineStopsWithWalkingDuration(
    allDepartures,
    userLocation
  );

  return filterDepartures(allDepartures, closestLineStops);
}
