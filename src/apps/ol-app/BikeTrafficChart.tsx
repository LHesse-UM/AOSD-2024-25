import React, { useMemo } from 'react';
import { Box } from "@open-pioneer/chakra-integration";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const weekdayNames = {
  "2": "Monday",
  "3": "Tuesday",
  "4": "Wednesday",
  "5": "Thursday",
  "6": "Friday",
  "7": "Saturday",
  "1": "Sunday",
};

const monthNames = {
  "1": "January",
  "2": "February",
  "3": "March",
  "4": "April",
  "5": "May",
  "6": "June",
  "7": "July",
  "8": "August",
  "9": "September",
  "10": "Oktober",
  "11": "November",
  "12": "December",
};

const BikeTrafficChart = ({ bikeCountData, timeRange, selectedMonth, selectedWeekday }) => {
  const chartData = useMemo(() => {
    const hourData = Array(24).fill(0);
    const hourCounts = Array(24).fill(0);

    bikeCountData.forEach(station => {
      station.data.forEach(entry => {
        const [dateStr, timeStr] = entry.timestamp.split(" ");
        const entryHour = parseInt(timeStr.split(":")[0], 10); 
        const entryMinutes = parseInt(timeStr.split(":")[1], 10);
        const entryDate = new Date(`${dateStr}T${timeStr}`);
        const entryWeekday = entryDate.getDay() === 0 ? 7 : entryDate.getDay();
        const entryMonth = entryDate.getMonth() + 1;
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

  // Mapping für die Anzeige der Tage und Monate
  const weekdayDisplay = selectedWeekday === "all" ? "alle Tage" : (weekdayNames[selectedWeekday] || selectedWeekday);
  const monthDisplay = selectedMonth === "all" ? "alle Monate" : (monthNames[selectedMonth] || selectedMonth);

  return (
    <>
      <Box fontSize="md" fontWeight="bold" mb={2} textAlign="center">
        Average Bicycle Traffic per Hour
      </Box>
      <Box fontSize="sm" color="gray.600" mb={4} textAlign="center">
        {`For ${weekdayDisplay} in ${monthDisplay}, between ${Math.floor(timeRange[0] / 60)
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
