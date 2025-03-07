import React, { useMemo } from 'react';
import { Box } from "@open-pioneer/chakra-integration";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BikeTrafficChart = ({ bikeCountData, timeRange, selectedMonth, selectedWeekday }) => {
  // Daten für das Diagramm vorbereiten
  const chartData = useMemo(() => {
    const hourData = Array(24).fill(0); // Array für 24 Stunden
    const hourCounts = Array(24).fill(0); // Zähler für Durchschnittsbildung

    bikeCountData.forEach(station => {
      station.data.forEach(entry => {
        const [dateStr, timeStr] = entry.timestamp.split(" ");
        const entryTime = timeStr.slice(0, 5); // HH:MM Format
        const entryHour = parseInt(timeStr.split(":")[0], 10); // Stunde extrahieren
        const entryMinutes = parseInt(timeStr.split(":")[1], 10);
        const entryDate = new Date(`${dateStr}T${timeStr}`);
        const entryWeekday = entryDate.getDay() === 0 ? 7 : entryDate.getDay(); // Sonntag = 7, Montag = 1

        const entryMonth = entryDate.getMonth() + 1; // Monatsindex auf 1-basierend
        const entryMinutesTotal = entryHour * 60 + entryMinutes;

        // FILTERUNG NACH AUSGEWÄHLTEM MONAT UND WOCHENTAG
        if ((selectedMonth === "all" || entryMonth === parseInt(selectedMonth, 10)) &&
            (selectedWeekday === "all" || entryWeekday === parseInt(selectedWeekday, 10)) &&
            entryMinutesTotal >= timeRange[0] &&
            entryMinutesTotal <= timeRange[1]) {
          
          hourData[entryHour] += entry.count;
          hourCounts[entryHour] += 1;
        }
      });
    });

    // Durchschnitt pro Stunde berechnen
    const processedData = hourData.map((count, hour) => ({
      hour: `${hour}:00`,
      Bicycles: hourCounts[hour] > 0 ? Math.round(count / hourCounts[hour]) : 0,
    }));

    return processedData;
  }, [bikeCountData, timeRange, selectedMonth, selectedWeekday]);

  return (
    <>
      <Box fontSize="md" fontWeight="bold" mb={2} textAlign="center">
        Average Bicycle Traffic per Hour
      </Box>
      <Box fontSize="sm" color="gray.600" mb={4} textAlign="center">
        {`For ${selectedWeekday === "all" ? "all days" : `weekday ${selectedWeekday}`} in ${
          selectedMonth === "all" ? "all months" : `month ${selectedMonth}`
        }, between ${Math.floor(timeRange[0] / 60)
          .toString()
          .padStart(2, "0")}:${(timeRange[0] % 60).toString().padStart(2, "0")} and ${Math.floor(
          timeRange[1] / 60
        )
          .toString()
          .padStart(2, "0")}:${(timeRange[1] % 60).toString().padStart(2, "0")}`}
      </Box>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="hour" label={{ value: "Time", position: "insideBottom", dy: 10 }} />
          <YAxis label={{ value: "Average Bicycles", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Bicycles" stroke="#82ca9d" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

export default BikeTrafficChart;
