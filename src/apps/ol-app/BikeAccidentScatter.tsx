import React, { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// Definiere den Radius für Unfälle in der Nähe der Stationen (WGS84-Koordinaten)
const ACCIDENT_RADIUS = 1000.102; // ca. 200m

const BikeAccidentScatter = ({ bikeCountData, accidentData }) => {
  // Daten vorbereiten
  const chartData = useMemo(() => {
    return bikeCountData.map(station => {
      const stationLon = parseFloat(station.lon);
      const stationLat = parseFloat(station.lat);

      // Finde Unfälle im Umkreis der Station
      const nearbyAccidents = accidentData.filter(accident => {
        if (!accident.XGCSWGS84 || !accident.YGCSWGS84) return false; // Schutz vor undefined-Werten

        const accidentLon = parseFloat(accident.XGCSWGS84.toString().replace(",", "."));
        const accidentLat = parseFloat(accident.YGCSWGS84.toString().replace(",", "."));

        return (
          !isNaN(accidentLon) &&
          !isNaN(accidentLat) &&
          Math.abs(stationLon - accidentLon) <= ACCIDENT_RADIUS &&
          Math.abs(stationLat - accidentLat) <= ACCIDENT_RADIUS
        );
      });

      // Berechne Durchschnittliche Fahrradzahlen für die Station
      const totalBikes = station.data.reduce((sum, entry) => sum + entry.count, 0);
      const avgBikesPerDay = station.data.length > 0 ? totalBikes / station.data.length : 0;

      return {
        stationId: station.id,
        avgBikesPerDay: Math.round(avgBikesPerDay),
        accidentCount: nearbyAccidents.length
      };
    });
  }, [bikeCountData, accidentData]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart>
        <CartesianGrid />
        <XAxis 
          type="number" 
          dataKey="avgBikesPerDay" 
          name="Fahrräder pro Tag" 
          unit="" 
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          type="number" 
          dataKey="accidentCount" 
          name="Unfälle in der Nähe" 
          unit="" 
          tick={{ fontSize: 12 }}
        />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
        <Scatter name="Stationen" data={chartData} fill="#ff7300" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default BikeAccidentScatter;
