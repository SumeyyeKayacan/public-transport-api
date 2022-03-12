import express from "express";
import cors from "cors";
import { getNearByDepartures } from "./nearby-departures";

const app = express();
const port = 8090;

app.use(express.json());
app.use(cors());

app.get("/status", function (req, res) {
  res.send({});
});

app.get("/departures", async (req, res) => {
  const { latitude, longitude, distance } = req.query;

  const departures = await getNearByDepartures(
    Number(latitude),
    Number(longitude),
    Number(distance)
  );
  res.send(departures);
});

app.listen(port, () => {
  console.log(`App is listening at http://localhost:${port}`);
});
