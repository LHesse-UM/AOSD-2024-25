import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  Select,
} from "@open-pioneer/chakra-integration";
import { MAP_ID } from "./services";
import { MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";
import { View, Feature } from "ol";
import { Point } from "ol/geom";
import AccidentBarChart from "./Accidentchartbar";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Spinner } from "@chakra-ui/react";
import BikeTrafficChart from "./BikeTrafficChart";
import BikeAccidentScatter from "./BikeAccidentScatter"

// ─── UTILITY-FUNKTIONEN ─────────────────────────────────────────────
// Konvertiert Minuten in einen HH:MM-String
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
};

// Konvertiert einen HH:MM-String in Minuten
const timeStringToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

// Generiert eine Liste von Zeitoptionen in 15-Minuten-Schritten
const generateTimeOptions = () => {
  const options = [];
  for (let minutes = 0; minutes < 1440; minutes += 15) {
    options.push(formatTime(minutes));
  }
  return options;
};

export function MapApp() {
  // STATE UND REFERENZEN
  const [weekday, setWeekday] = useState("1"); // z. B. Montag
  const [month, setMonth] = useState("1"); // z. B. Januar
  const [timeRange, setTimeRange] = useState([480, 1020]); // Standard: 08:00 bis 17:00
  const [loading, setLoading] = useState(false);
  const [bikeCountData, setBikeCountData] = useState([]);
  const [accidentData, setAccidentData] = useState([]);
  const [rawAccidentData, setRawAccidentData] = useState([]); // Für gecachte Unfalldaten

  // Refs für Unfall-Layer, GeoJSON-Source und Station-Layer
  const accidentsLayerRef = useRef(null);
  const vectorSourceRef = useRef(null);
  const stationLayerRef = useRef(null);

  // Map aus dem Map-Model
  const { map } = useMapModel(MAP_ID);

  // Konstanten für Zählstationen und Zeitraum
  const stationIds = [
    "100020113",
    "100031297",
    "100031300",
    "100034978",
    "100034980",
    "100034981",
    "100034982",
    "100035541",
    "100053305",
  ];
  const years = [2019, 2020, 2021, 2022, 2023];
  const monthsArray = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );

  // ─── CSV-Import-FUNKTIONEN ─────────────────────────────────────────────
  const loadCSVs = async (csvPath) => {
    const response = await fetch(csvPath);
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der CSV: ${csvPath}`);
    }
    const csvText = await response.text();
    const rows = csvText.split("\n").map((row) => row.split(","));
    rows.shift(); // Header entfernen
    return rows
      .filter((row) => row.length > 1)
      .map((row) => ({
        timestamp: row[0].trim(),
        count: parseInt(row[1].trim(), 10),
      }))
      .filter((entry) => !isNaN(entry.count));
  };

  const loadBikeCountData = async () => {
    setLoading(true);
    const allData = [];
    for (const stationId of stationIds) {
      const stationData = [];
      for (const year of years) {
        for (const month of monthsArray) {
          const path = `./data/radverkehr-zaehlstellen/${stationId}/${year}-${month}.csv`;
          try {
            const data = await loadCSVs(path);
            stationData.push(...data);
          } catch (error) {
            console.warn(`Datei nicht gefunden oder nicht lesbar: ${path}`);
          }
        }
      }
      allData.push({ id: stationId, data: stationData });
    }
    setBikeCountData(allData);
    setLoading(false);
  };

  const loadCSV = async (csvUrl) => {
    const response = await fetch(csvUrl);
    const csvText = await response.text();
    const rows = csvText.split("\n").map((row) => row.split(";"));
    const headers = rows.shift();
    if (!headers) return [];
    const cleanedHeaders = headers.map((header) =>
      header.trim().replace(/"/g, "")
    );
    return rows.map((row) =>
      Object.fromEntries(row.map((val, index) => [cleanedHeaders[index], val]))
    );
  };

  // ─── Unfalldaten Caching ─────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const loadAccidentData = async () => {
      const csvFiles = [
        "./data/Unfallorte2019_LinRef.csv",
        "./data/Unfallorte2020_LinRef.csv",
        "./data/Unfallorte2021_LinRef.csv",
        "./data/Unfallorte2022_LinRef.csv",
        "./data/Unfallorte2023_LinRef.csv",
      ];
      let allData = [];
      for (const url of csvFiles) {
        try {
          const data = await loadCSV(url);
          allData.push(...data);
        } catch (error) {
          console.warn(`Fehler beim Laden der Unfalldaten: ${url}`, error);
        }
      }
      setRawAccidentData(allData);
    };
    loadAccidentData();
    setLoading(false);
  }, []);

  // ─── Unfalldaten in die Karte einfügen ─────────────────────────────────────────────
useEffect(() => {
  if (!map?.olMap || rawAccidentData.length === 0) return;
  if (accidentsLayerRef.current) {
    map.olMap.removeLayer(accidentsLayerRef.current);
  }
  
  // Definiere die Bounding Box (wie in der Karte)
  const boundingBox = {
    minX: 7.53,
    maxX: 7.75,
    minY: 51.88,
    maxY: 52.05,
  };
  const isWithinBoundingBox = (lon: number, lat: number) =>
    lon >= boundingBox.minX &&
    lon <= boundingBox.maxX &&
    lat >= boundingBox.minY &&
    lat <= boundingBox.maxY;
  
  // Filtere die Unfalldaten: Monat, Wochentag und Bounding Box
  const filteredData = rawAccidentData.filter((entry) => {
    const matchesMonth =
      month === "all" || parseInt(entry.UMONAT) === parseInt(month);
    const matchesWeekday =
      weekday === "all" || parseInt(entry.UWOCHENTAG) === parseInt(weekday);
    if (!(matchesMonth && matchesWeekday)) return false;
    if (entry.XGCSWGS84 && entry.YGCSWGS84) {
      const lon = parseFloat(
        entry.XGCSWGS84.trim().replace("\r", "").replace(",", ".")
      );
      const lat = parseFloat(
        entry.YGCSWGS84.trim().replace("\r", "").replace(",", ".")
      );
      return !isNaN(lon) && !isNaN(lat) && isWithinBoundingBox(lon, lat);
    }
    return false;
  });
  setAccidentData(filteredData);

  // Erstelle einen VectorSource für die Karte anhand der gefilterten Daten
  const vectorSource = new VectorSource();
  filteredData.forEach((entry) => {
    const lon = parseFloat(
      entry.XGCSWGS84.trim().replace("\r", "").replace(",", ".")
    );
    const lat = parseFloat(
      entry.YGCSWGS84.trim().replace("\r", "").replace(",", ".")
    );
    if (!isNaN(lon) && !isNaN(lat) && isWithinBoundingBox(lon, lat)) {
      const feature = new Feature({
        geometry: new Point([lon, lat]),
      });
      vectorSource.addFeature(feature);
    }
  });
  const vectorLayer = new VectorLayer({
    source: vectorSource,
    style: new Style({
      image: new CircleStyle({
        radius: 3,
        fill: new Fill({ color: "red" }),
        stroke: new Stroke({ color: "white", width: 1 }),
      }),
    }),
  });
  accidentsLayerRef.current = vectorLayer;
  map.olMap.addLayer(vectorLayer);
}, [map, month, weekday, rawAccidentData]);


  // ─── Fahrradzähl-Daten laden ─────────────────────────────────────────────
  useEffect(() => {
    loadBikeCountData();
  }, []);

  // ─── Initialisiere Karte und GeoJSON-Layer für Fahrradstationen ─────────────────────────────────────────────
  useEffect(() => {
    if (!map?.olMap) return;
    map.olMap.setView(
      new View({
        projection: "EPSG:4326",
        center: [7.63, 51.96],
        zoom: 13,
      })
    );
    map.olMap.getView().setMaxZoom(19);
    const vectorSource = new VectorSource({
      url: "./data/fahrradzaehl-standorte.geojson",
      format: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }),
    });
    vectorSourceRef.current = vectorSource;
    const defaultStyle = (feature) => {
      const totalCount = feature.get("totalCount") || 0;
      const radius = Math.min(20, 5 + totalCount / 100);
      return new Style({
        image: new CircleStyle({
          radius: radius,
          fill: new Fill({ color: "blue" }),
          stroke: new Stroke({ color: "white", width: 1 }),
        }),
      });
    };
    const stationLayer = new VectorLayer({
      source: vectorSource,
      style: defaultStyle,
    });
    stationLayerRef.current = stationLayer;
    map.olMap.addLayer(stationLayer);
  }, [map]);

   // Füge in MapApp, direkt nach der Initialisierung der Map hinzu:
   const handleReset = () => {
    setWeekday("1");
    setMonth("1");
    setTimeRange([480, 1020]);
    if (map?.olMap) {
      map.olMap.setView(
        new View({
          projection: "EPSG:4326",
          center: [7.63, 51.96],
          zoom: 13,
        })
      );
    }
  };

  // ─── Dynamische Aktualisierung der Symbolisierung ─────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    if (!vectorSourceRef.current || !bikeCountData.length) return;
    const features = vectorSourceRef.current.getFeatures();
    if (!features.length) return;
    features.forEach((feature) => {
      const stationId = String(feature.get("id"));
      const stationData = bikeCountData.find((s) => s.id === stationId);
      if (stationData) {
        const filteredEntries = stationData.data.filter((entry) => {
          const [dateStr, timeStr] = entry.timestamp.split(" ");
          const entryMinutes = timeStringToMinutes(timeStr);
          const date = new Date(`${dateStr}T${timeStr}`);
          const entryWeekday = date.getDay() === 0 ? 7 : date.getDay();
          const weekdayMatch =
            weekday === "all" || entryWeekday === parseInt(weekday, 10);
          const entryMonth = date.getMonth() + 1;
          const monthMatch =
            month === "all" || entryMonth === parseInt(month, 10);
          return (
            entryMinutes >= timeRange[0] &&
            entryMinutes <= timeRange[1] &&
            weekdayMatch &&
            monthMatch
          );
        });
        const totalCount = filteredEntries.reduce(
          (sum, entry) => sum + entry.count,
          0
        );
        feature.set("totalCount", totalCount);
      }
    });
    const counts = features.map((f) => f.get("totalCount") || 0);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const sortedCounts = [...counts].sort((a, b) => a - b);
    const effectiveMax =
      sortedCounts[Math.floor(0.8 * sortedCounts.length)] || maxCount;
    const scaleRadius = (count) => {
      const minRadius = 2;
      const maxRadius = 7;
      if (effectiveMax === minCount) return minRadius;
      const normalized = (count - minCount) / (effectiveMax - minCount);
      const powered = Math.pow(normalized, 1.2);
      return minRadius + powered * (maxRadius - minRadius);
    };
    const dynamicStyle = (feature) => {
      const totalCount = feature.get("totalCount") || 0;
      const radius = scaleRadius(totalCount);
      return new Style({
        image: new CircleStyle({
          radius: radius,
          fill: new Fill({ color: "blue" }),
          stroke: new Stroke({ color: "white", width: 1 }),
        }),
      });
    };
    if (stationLayerRef.current) {
      stationLayerRef.current.setStyle(dynamicStyle);
      stationLayerRef.current.changed();
    }
    setLoading(false)
  }, [bikeCountData, timeRange, month, weekday]);

  // ─── Aggregierte Zählungen für die Anzeige der Statistiken ─────────────────────────────────────────────
  // Aktualisierte Aggregation: Berechnung des Durchschnitts statt der Gesamtsumme
const aggregatedCounts = useMemo(() => {
  return bikeCountData.reduce((acc, station) => {
    const filteredEntries = station.data.filter((entry) => {
      const [dateStr, timeStr] = entry.timestamp.split(" ");
      const entryMinutes = timeStringToMinutes(timeStr);
      const date = new Date(`${dateStr}T${timeStr}`);
      const entryWeekday = date.getDay() === 0 ? 7 : date.getDay();
      const weekdayMatch =
        weekday === "all" || entryWeekday === parseInt(weekday, 10);
      const entryMonth = date.getMonth() + 1;
      const monthMatch =
        month === "all" || entryMonth === parseInt(month, 10);
      return (
        entryMinutes >= timeRange[0] &&
        entryMinutes <= timeRange[1] &&
        weekdayMatch &&
        monthMatch
      );
    });
    const totalCount = filteredEntries.reduce(
      (sum, entry) => sum + entry.count,
      0
    );
    const averageCount =
      filteredEntries.length > 0 ? totalCount / filteredEntries.length : 0;
    // Auf zwei Nachkommastellen runden
    acc[station.id] = Math.round(averageCount * 100) / 100;
    return acc;
  }, {});
}, [bikeCountData, timeRange, weekday, month]);


  const timeOptions = useMemo(() => generateTimeOptions(), []);

  // ─── INTERNE KOMPONENTEN FÜR NAVIGATION ─────────────────────────────────────────────

  const Header = () => (
    <Flex
      as="header"
      backgroundColor="gray.100"
      padding={4}
      justifyContent="space-between"
      alignItems="center"
      borderBottom="1px solid"
      borderColor="gray.200"
    >
      <Text fontSize="lg" fontWeight="bold">
        Münster Bicycle Safety Analysis
      </Text>
      <Flex gap={4}>
        <Button as={Link} to="/">
          Map Page
        </Button>
        <Button as={Link} to="/stats">
          Statistics
        </Button>
        <Button colorScheme="red" onClick={handleReset}>
          Reset Application
        </Button>
      </Flex>
    </Flex>
  );

  const MainPage = () => (
    <Flex
      flex="1"
      direction="column"
      justifyContent="center"
      alignItems="center"
      padding={4}
    >
      {/* Filter-Dropdowns */}
      <Flex width="50%" justifyContent="space-between" mb={4}>
        <Box width="48%">
          <Text mb={2}>Select a weekday</Text>
          <Select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
            <option value="all">Any Weekday</option>
            <option value="1">Sunday</option>
            <option value="2">Monday</option>
            <option value="3">Tuesday</option>
            <option value="4">Wednesday</option>
            <option value="5">Thursday</option>
            <option value="6">Friday</option>
            <option value="7">Saturday</option>
          </Select>
        </Box>
        <Box width="48%">
          <Text mb={2}>Select a month</Text>
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">Any Month</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </Select>
        </Box>
      </Flex>

      {/* Karte */}
      <Box
        backgroundColor="white"
        borderWidth="2px"
        borderRadius="lg"
        boxShadow="lg"
        overflow="hidden"
        width="80%"
        height="60%"
      >
        <MapContainer mapId={MAP_ID} role="main">
          <MapAnchor position="bottom-right" horizontalGap={10} verticalGap={30}>
            <Flex direction="column" gap={1} padding={1}>
              <InitialExtent mapId={MAP_ID}/>
              <ZoomIn mapId={MAP_ID} />
              <ZoomOut mapId={MAP_ID} />
            </Flex>
          </MapAnchor>
        </MapContainer>
      </Box>

      {/* Zeitintervall-Picker */}
      <Flex direction="column" alignItems="center" width="100%" mt={8}>
        <Text mb={4} fontSize="lg" fontWeight="bold">
          Choose a time interval
        </Text>
        <Flex gap={4}>
          <Box>
            <Text mb={1}>Start</Text>
            <Select
              value={formatTime(timeRange[0])}
              onChange={(e) => {
                const newStart = timeStringToMinutes(e.target.value);
                setTimeRange(([currentStart, currentEnd]) =>
                  newStart > currentEnd ? [newStart, newStart] : [newStart, currentEnd]
                );
              }}
            >
              {timeOptions.map((timeStr) => (
                <option key={timeStr} value={timeStr}>
                  {timeStr}
                </option>
              ))}
            </Select>
          </Box>
          <Box>
            <Text mb={1}>End</Text>
            <Select
              value={formatTime(timeRange[1])}
              onChange={(e) => {
                const newEnd = timeStringToMinutes(e.target.value);
                setTimeRange(([currentStart, currentEnd]) =>
                  newEnd < currentStart ? [newEnd, newEnd] : [currentStart, newEnd]
                );
              }}
            >
              {timeOptions.map((timeStr) => (
                <option key={timeStr} value={timeStr}>
                  {timeStr}
                </option>
              ))}
            </Select>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );

  const StatsPage = () => (
    <Flex flex="1" direction="column" padding={4} overflowY="auto">
      {/* Filter-Dropdowns */}
      <Flex width="50%" justifyContent="space-between" mb={4}>
        <Box width="48%">
          <Text mb={2}>Select a weekday</Text>
          <Select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
            <option value="all">Any Workday</option>
            <option value="1">Sunday</option>
            <option value="2">Monday</option>
            <option value="3">Tuesday</option>
            <option value="4">Wednesday</option>
            <option value="5">Thursday</option>
            <option value="6">Friday</option>
            <option value="7">Saturday</option>
          </Select>
        </Box>
        <Box width="48%">
          <Text mb={2}>Select a month</Text>
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">Any Month</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </Select>
        </Box>
      </Flex>
  
      {/* Zeitintervall-Picker */}
      <Flex direction="column" alignItems="center" width="100%" mt={4}>
        <Text mb={4} fontSize="lg" fontWeight="bold">
          Choose a time interval
        </Text>
        <Flex gap={4}>
          <Box>
            <Text mb={1}>Start</Text>
            <Select
              value={formatTime(timeRange[0])}
              onChange={(e) => {
                const newStart = timeStringToMinutes(e.target.value);
                setTimeRange(([currentStart, currentEnd]) =>
                  newStart > currentEnd ? [newStart, newStart] : [newStart, currentEnd]
                );
              }}
            >
              {timeOptions.map((timeStr) => (
                <option key={timeStr} value={timeStr}>
                  {timeStr}
                </option>
              ))}
            </Select>
          </Box>
          <Box>
            <Text mb={1}>End</Text>
            <Select
              value={formatTime(timeRange[1])}
              onChange={(e) => {
                const newEnd = timeStringToMinutes(e.target.value);
                setTimeRange(([currentStart, currentEnd]) =>
                  newEnd < currentStart ? [newEnd, newEnd] : [currentStart, newEnd]
                );
              }}
            >
              {timeOptions.map((timeStr) => (
                <option key={timeStr} value={timeStr}>
                  {timeStr}
                </option>
              ))}
            </Select>
          </Box>
        </Flex>
      </Flex>
  
      {/* Aggregierte Fahrradzählungen */}
       <Box
        mt={4}
        width="60%"
        borderWidth="1px"
        borderRadius="md"
        p={4}
        boxShadow="sm"
        backgroundColor="white"
      >
        {Object.entries(aggregatedCounts).map(([stationId, count]) => {
          const stationFeature = vectorSourceRef.current
            ?.getFeatures()
            .find((feature) => String(feature.get("id")) === stationId);
          const stationName = stationFeature
            ? stationFeature.get("name") || `Station ${stationId}`
            : `Station ${stationId}`;

          return (
            <Flex
              key={stationId}
              justifyContent="space-between"
              borderBottom="1px solid"
              borderColor="gray.200"
              p={2}
            >
              <Text fontSize="sm">{stationName}</Text>
              <Text fontSize="sm">{Math.round(count)} Bicycles</Text>
            </Flex>
          );
        })}
      </Box>
  
      {/* Diagramme */}
      <Box width="80%" mt={6}>
        <Text fontSize="lg" fontWeight="bold" mb={2} textAlign="center">
          Average Bicycle traffic per hour        </Text>
        <BikeTrafficChart
          bikeCountData={bikeCountData}
          timeRange={timeRange}
          selectedMonth={month}
          selectedWeekday={weekday}
        />
        <Text fontSize="lg" fontWeight="bold" mb={2} textAlign="center">
          Accident statistics - Worday and Weekends
        </Text>
        <AccidentBarChart
          accidentData={rawAccidentData}  // Deine rohen Unfalldaten
          selectedMonth={month}  // Monat auswählen
        />
      </Box>
      <Box width="80%" mt={6} mb={6}>
        <Text fontSize="lg" fontWeight="bold" mb={2} textAlign="center">
          Zusammenhang zwischen Fahrradverkehr und Unfällen
        </Text>
        <BikeAccidentScatter bikeCountData={bikeCountData} accidentData={rawAccidentData} />
      </Box>
    </Flex>
  );
  
  

  return (
    <>
    {loading && (
      <Flex
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(255, 255, 255, 0.8)"
        zIndex="overlay"
        justifyContent="center"
        alignItems="center"
        backdropFilter="blur(4px)"
      >
        <Box textAlign="center">
          <Text fontSize="xl" fontWeight="bold" mb={2}>
            Loading Data...
          </Text>
          <Spinner size="xl" />
        </Box>
      </Flex>
    )}    
    <Router>
      <Flex height="100vh" direction="column" overflow="hidden" width="100%">
        <Header />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
        <Flex
          as="footer"
          role="region"
          gap={3}
          alignItems="center"
          justifyContent="center"
          padding={4}
          borderTop="1px solid"
          borderColor="gray.200"
        ></Flex>
      </Flex>
    </Router>
    </>
  );
}
