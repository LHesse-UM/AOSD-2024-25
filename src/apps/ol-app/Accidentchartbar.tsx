import React, { useMemo } from 'react';
import { Box } from "@open-pioneer/chakra-integration";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// Hilfsfunktion: Gibt für ein Jahr und einen 1-indexierten Monat zurück, wie viele Werktage und Wochenendtage es gibt.
const countDaysInMonth = (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekdayCount = 0, weekendCount = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const jsDay = d.getDay(); // 0 = Sonntag, 6 = Samstag
    // Konvertiere in das Unfallformat: Sonntag = 1, Montag = 2, …, Samstag = 7
    const accidentDay = jsDay === 0 ? 1 : jsDay === 6 ? 7 : jsDay + 1;
    if (accidentDay >= 2 && accidentDay <= 6) {
      weekdayCount++;
    } else {
      weekendCount++;
    }
  }
  return { weekday: weekdayCount, weekend: weekendCount };
};

const AccidentBarChart = ({ accidentData, selectedMonth }: { accidentData: any[], selectedMonth: string }) => {
  // Definiere die betrachteten Jahre – diese sollten zu deinen Unfall-CSV-Dateien passen.
  const years = [2019, 2020, 2021, 2022, 2023];

  const chartData = useMemo(() => {
    // Filtere die Daten nach Monat, falls nicht "all" ausgewählt ist.
    const filteredData =
      selectedMonth === "all"
        ? accidentData
        : accidentData.filter(
            (entry) => parseInt(entry.UMONAT, 10) === parseInt(selectedMonth, 10)
          );
    
    // Aggregiere die Unfallanzahl (als Anzahl der Einträge) in die beiden Kategorien.
    let totalCounts = { weekday: 0, weekend: 0 };
    filteredData.forEach(entry => {
      const day = parseInt(entry.UWOCHENTAG, 10);
      if (!isNaN(day)) {
        if (day >= 2 && day <= 6) {
          totalCounts.weekday += 1;
        } else if (day === 1 || day === 7) {
          totalCounts.weekend += 1;
        }
      }
    });

    // Berechne, wie viele Tage insgesamt in den ausgewählten Monaten vorhanden sind.
    let totalWeekdayDays = 0, totalWeekendDays = 0;
    if (selectedMonth === "all") {
      years.forEach(year => {
        for (let m = 1; m <= 12; m++) {
          const counts = countDaysInMonth(year, m);
          totalWeekdayDays += counts.weekday;
          totalWeekendDays += counts.weekend;
        }
      });
    } else {
      const monthNumber = parseInt(selectedMonth, 10);
      years.forEach(year => {
        const counts = countDaysInMonth(year, monthNumber);
        totalWeekdayDays += counts.weekday;
        totalWeekendDays += counts.weekend;
      });
    }

      // Berechne den Durchschnitt (Unfälle pro Tag) für beide Kategorien, gerundet auf ganze Zahlen.
      const avgWeekday = totalWeekdayDays > 0 ? Math.round(totalCounts.weekday / totalWeekdayDays) : 0;
      const avgWeekend = totalWeekendDays > 0 ? Math.round(totalCounts.weekend / totalWeekendDays) : 0;
   
    return [
      { name: selectedMonth === "all" ? 'Workday' : 'Workday', Accidents: avgWeekday },
      { name: selectedMonth === "all" ? 'Weekend' : 'Weekend', Accidents: avgWeekend },
    ];
  }, [accidentData, selectedMonth, years]);

  return (
    <>
      <Box fontSize="md" fontWeight="bold" mb={2} textAlign="center">
        Average Bicycle Accidents per Day in Selected Month
      </Box>
      <Box display="flex" justifyContent="center" mt={4}>
        <BarChart width={600} height={300} data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Accidents" fill="#8884d8" />
        </BarChart>
      </Box>
    </>
  );
};

export default AccidentBarChart;
