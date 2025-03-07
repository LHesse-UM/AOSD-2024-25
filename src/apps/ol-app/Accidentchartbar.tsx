import React, { useMemo } from 'react';
import { Box } from "@open-pioneer/chakra-integration";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const countDaysInMonth = (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekdayCount = 0, weekendCount = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const jsDay = d.getDay(); // 0 = Sonntag, 6 = Samstag
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
  const years = [2019, 2020, 2021, 2022, 2023];

  // Mapping für Monatsnamen
  const monthNames = {
    "1": "January", "2": "February", "3": "March", "4": "April",
    "5": "May", "6": "June", "7": "July", "8": "August",
    "9": "September", "10": "October", "11": "November", "12": "December"
  };

  const chartData = useMemo(() => {
    const filteredData =
      selectedMonth === "all"
        ? accidentData
        : accidentData.filter(
            (entry) => parseInt(entry.UMONAT, 10) === parseInt(selectedMonth, 10)
          );
    
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

    const avgWeekday = totalWeekdayDays > 0 ? Math.round(totalCounts.weekday / totalWeekdayDays) : 0;
    const avgWeekend = totalWeekendDays > 0 ? Math.round(totalCounts.weekend / totalWeekendDays) : 0;
   
    return [
      { name: 'Workday', Accidents: avgWeekday },
      { name: 'Weekend', Accidents: avgWeekend },
    ];
  }, [accidentData, selectedMonth, years]);

  return (
    <>
      <Box fontSize="md" fontWeight="bold" mb={2} textAlign="center">
        Average Bicycle Accidents per Day
      </Box>
      <Box fontSize="sm" color="gray.600" mb={4} textAlign="center">
        {selectedMonth === "all" ? "For all months" : `For ${monthNames[selectedMonth]}`}
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
