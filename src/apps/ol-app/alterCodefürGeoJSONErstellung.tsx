import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
} from "@open-pioneer/chakra-integration";
import { MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { ScaleBar } from "@open-pioneer/scale-bar";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import { CoordinateViewer } from "@open-pioneer/coordinate-viewer";
import { Geolocation } from "@open-pioneer/geolocation";
import { ScaleViewer } from "@open-pioneer/scale-viewer";
import { MAP_ID } from "./services";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";
import { transform } from "ol/proj";
import Icon from "ol/style/Icon";
import axios, { all } from "axios";
import { Feature, View } from "ol";
import { Point } from "ol/geom";

export function MapApp() {
  const [weekday, setWeekday] = useState<string>("1"); // 1 = Montag
  const [month, setMonth] = useState<string>("1"); // 1 = Januar
  const [timeRange, setTimeRange] = useState<[number, number]>([480, 1020]); // Standard: 08:00 - 17:00
  const [time, setTime] = useState<number>(720);
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [bikeCountData, setBikeCountData] = useState<any[]>([]);

  // Referenz für den Layer
  const accidentsLayerRef = useRef<VectorLayer<any> | null>(null);

  const { map } = useMapModel(MAP_ID);


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
  ]; // Liste der Zählstationen
  const years = [2019, 2020, 2021, 2022, 2023]; // Jahre von 2019 bis 2023
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0")); // Monate 01-12

  const generatePaths = () => {
    const paths: string[] = [];
    stationIds.forEach((stationId) => {
      years.forEach((year) => {
        months.forEach((month) => {
          const path = `./img/radverkehr-zaehlstellen/${stationId}/${year}-${month}.csv`;
          paths.push(path);
        });
      });
    });
    return paths;
  };

  const loadBikeCountData = async () => {
    setLoading(true);
    const allData = [];
  
    for (const stationId of stationIds) {
      const stationData = [];
  
      for (const year of years) {
        for (const month of months) {
          const path = `./img/radverkehr-zaehlstellen/${stationId}/${year}-${month}.csv`;
          try {
            const data = await loadCSVs(path);
            stationData.push(...data); // Gültige Daten hinzufügen
          } catch (error) {
            console.warn(`Datei nicht gefunden oder nicht lesbar: ${path}`);
          }
        }
      }
  
      allData.push({ id: stationId, data: stationData });
    }
  
    console.log(allData)
    setBikeCountData(allData);
    setLoading(false);
  };
  
  

  const loadCSVs = async (csvPath: string): Promise<any[]> => {
    const response = await fetch(csvPath);
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der CSV: ${csvPath}`);
    }
  
    const csvText = await response.text();
    const rows = csvText.split("\n").map((row) => row.split(","));
    rows.shift(); // Entferne Header
  
    return rows
      .filter((row) => row.length > 1) // Nur vollständige Zeilen
      .map((row) => ({
        timestamp: row[0].trim(),
        count: parseInt(row[1].trim(), 10),
      }))
      .filter((entry) => !isNaN(entry.count)); // Entferne ungültige Einträge
  };
  
  

  const getIdFromPath = (path: string): string => {
    const parts = path.split("/");
    return parts[parts.length - 2]; // Ordnername als ID
  };

  useEffect(() => {
    loadBikeCountData();
  }, []);


  // Karte initialisieren
  useEffect(() => {
    if (!map?.olMap) return;
  
    // Karte und View initialisieren
    map.olMap.setView(
      new View({
        projection: "EPSG:4326",
        center: [7.63, 51.96],
        zoom: 13,
      })
    );
  
    map.olMap.getView().setMaxZoom(19);
  
    // Fahrrad-Zählstationen aus GeoJSON laden
    const fahrradZaehlstationen = new VectorSource({
      url: "./img/fahrradzaehl-standorte.geojson",
      format: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }),
    });
  
    const plannedAreasLayer = new VectorLayer({
      source: fahrradZaehlstationen,
    });
  
    map.olMap.addLayer(plannedAreasLayer);
  
    // Warte auf `bikeCountData` und GeoJSON-Features
    const checkAndLinkData = () => {
      if (bikeCountData.length === 0 || fahrradZaehlstationen.getFeatures().length === 0) {
        console.warn("Entweder bikeCountData oder GeoJSON-Features sind noch nicht geladen.");
        return; // Warte, bis beide verfügbar sind
      }
  
      // Verknüpfe die Daten mit den Features
      const features = fahrradZaehlstationen.getFeatures();
      features.forEach((feature) => {
        const stationId = String(feature.get("id")); // ID aus GeoJSON-Feature
        console.log(stationId)  
        const stationData = bikeCountData.find((station) => station.id === stationId);
  
        console.log(stationData)
        if (stationData) {
          feature.set("bikeData", stationData.data);
          console.log(`Feature ID: ${stationId} wurde erfolgreich verknüpft.`);
        }
      });
  
      console.log("Verknüpfung hergestellt zwischen GeoJSON-Features und bikeCountData.");
      const format = new GeoJSON();
  const geoJSONData = format.writeFeaturesObject(features, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:4326",
  });

  const geoJSONString = JSON.stringify(geoJSONData, null, 2);

  // Datei herunterladen
  /*
  const blob = new Blob([geoJSONString], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "updated-fahrrad-zaehlstationen.geojson";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  */

  console.log("GeoJSON wurde exportiert und heruntergeladen.");
    };
  
    // Beobachte `bikeCountData` und Features
    const observer = setInterval(() => {
      checkAndLinkData();
      if (bikeCountData.length > 0 && fahrradZaehlstationen.getFeatures().length > 0) {
        clearInterval(observer); // Stoppe, sobald beide geladen sind
      }
    }, 500); // Überprüfe alle 500ms
  
    return () => clearInterval(observer); // Aufräumen
  }, [map, bikeCountData]);

  // Daten bei Änderungen neu laden
  useEffect(() => {
    if (!map?.olMap) return;

    const csvFiles = [
      "./img/Unfallorte2019_LinRef.csv",
      "./img/Unfallorte2020_LinRef.csv",
      "./img/Unfallorte2021_LinRef.csv",
      "./img/Unfallorte2022_LinRef.csv",
      "./img/Unfallorte2023_LinRef.csv",
    ];
    console.log("test")

    addAccidentPoints(csvFiles, month, weekday, timeRange);

  }, [month, weekday, map]);

  async function addAccidentPoints(csvUrls: string[], selectedMonth: string, selectedWeekday: string, timeRange: [number, number]) {
    try {
      if (accidentsLayerRef.current) {
        map.olMap.removeLayer(accidentsLayerRef.current);
      }

      const allData: any[] = [];

      // Alle CSVs laden und Daten kombinieren
      for (const url of csvUrls) {
        const data = await loadCSV(url);
        allData.push(...data);
      }

      // Filterung
      const filteredData = allData.filter((entry) => {
        const matchesMonth =
          selectedMonth === "all" || parseInt(entry.UMONAT) === parseInt(selectedMonth);
        const matchesWeekday =
          selectedWeekday === "all" || parseInt(entry.UWOCHENTAG) === parseInt(selectedWeekday);
        return matchesMonth && matchesWeekday;
      });

      const vectorSource = new VectorSource();

      const boundingBox = {
        minX: 7.53,
        maxX: 7.75,
        minY: 51.88,
        maxY: 52.05,
      };

      function isWithinBoundingBox(lon: number, lat: number) {
        return (
          lon >= boundingBox.minX &&
          lon <= boundingBox.maxX &&
          lat >= boundingBox.minY &&
          lat <= boundingBox.maxY
        );
      }

      // Punkte hinzufügen
      filteredData.forEach((entry) => {
        if (entry.XGCSWGS84 && entry.YGCSWGS84) {
          // Bereinige nur, falls nötig (z. B. bei Leerzeichen oder \r)
          const lonString = entry.XGCSWGS84.trim().replace("\r", "").replace(",", ".");
          const latString = entry.YGCSWGS84.trim().replace("\r", "").replace(",", ".");
      
          const lon = parseFloat(lonString);
          const lat = parseFloat(latString);
      
          // Prüfen, ob die bereinigten Werte gültige Zahlen sind und in der Bounding Box liegen
          if (!isNaN(lon) && !isNaN(lat) && isWithinBoundingBox(lon, lat)) {
            const feature = new Feature({
              geometry: new Point([lon, lat]),
            });
            vectorSource.addFeature(feature);
          } 
        } else {
          console.warn(
            "Eintrag übersprungen, da XGCSWGS84 oder YGCSWGS84 fehlt:",
            entry
          );
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
    } catch (err) {
      console.error("Fehler beim Hinzufügen der Unfalldaten:", err);
    }
  }

  async function loadCSV(csvUrl: string) {
    const response = await fetch(csvUrl);
    const csvText = await response.text();
    const rows = csvText.split("\n").map((row) => row.split(";"));

    const headers = rows.shift();
    if (!headers) return [];

     // Bereinige die Header-Namen
  const cleanedHeaders = headers.map((header) =>
    header.trim().replace(/"/g, "")
  );

    const data = rows.map((row) =>
      Object.fromEntries(row.map((val, index) => [cleanedHeaders[index], val]))
    );

    return data;
  }
  

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
      .toString()
      .padStart(2, "0");
    const mins = (minutes % 60).toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  const handleStartChange = (val: number) => {
    setTimeRange(([start, end]) => [Math.min(val, end), end]);
  };

  const handleEndChange = (val: number) => {
    setTimeRange(([start, end]) => [start, Math.max(val, start)]);
  };

  /////////////////////////////////////////////////////////////////////////////////////////

  /* 
    Code für die Zählstationen
  */
    
    



  return (
    <Flex height="100vh" direction="column" overflow="hidden" width="100%">
      {/* Header */}
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
        <Button variant="link" colorScheme="red">
          Reset Application
        </Button>
      </Flex>

      {/* Content */}
      <Flex
        flex="1"
        direction="column"
        justifyContent="center"
        alignItems="center"
        padding={4}
      >
        {/* Dropdowns für Wochentag und Monat */}
        <Flex width="50%" justifyContent="space-between" mb={4}>
          <Box width="48%">
            <Text mb={2}>Wähle einen Wochentag</Text>
            <Select
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
            >
              <option value="all">Beliebiger Wochentag</option>
              <option value="1">Montag</option>
              <option value="2">Dienstag</option>
              <option value="3">Mittwoch</option>
              <option value="4">Donnerstag</option>
              <option value="5">Freitag</option>
              <option value="6">Samstag</option>
              <option value="7">Sonntag</option>
            </Select>
          </Box>
          <Box width="48%">
            <Text mb={2}>Wähle einen Monat</Text>
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">Alle Monate</option>
              <option value="1">Januar</option>
              <option value="2">Februar</option>
              <option value="3">März</option>
              <option value="4">April</option>
              <option value="5">Mai</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Dezember</option>
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
          width="70%"
          height="50%"
        >
          <MapContainer mapId={MAP_ID} role="main">
            <MapAnchor
              position="bottom-right"
              horizontalGap={10}
              verticalGap={30}
            >
              <Flex direction="column" gap={1} padding={1}>
                <Geolocation mapId={MAP_ID} />
                <InitialExtent mapId={MAP_ID} />
                <ZoomIn mapId={MAP_ID} />
                <ZoomOut mapId={MAP_ID} />
              </Flex>
            </MapAnchor>
          </MapContainer>
        </Box>

        <Flex>
          <CoordinateViewer mapId={MAP_ID} precision={2} />
          <ScaleBar mapId={MAP_ID} />
          <ScaleViewer mapId={MAP_ID} />
        </Flex>

        {/* Uhrzeit Slider */}
        <Flex direction="column" alignItems="center" width="100%" mt={8}>
      <Text mb={4} fontSize="lg" fontWeight="bold">
        Wähle ein Zeitintervall
      </Text>

      {/* Slider */}
      <Box position="relative" width="70%">
        {/* Track für das Intervall */}
        <Slider
          value={timeRange[0]}
          min={0}
          max={1440}
          step={15}
          onChange={handleStartChange}
        >
          <SliderTrack bg="gray.200">
            <SliderFilledTrack bg="blue.500" />
          </SliderTrack>
          <SliderThumb boxSize={6}>
            <Box color="black" fontSize="sm" fontWeight="bold">
              {formatTime(timeRange[0])}
            </Box>
          </SliderThumb>
        </Slider>

        {/* End-Slider */}
        <Slider
          value={timeRange[1]}
          min={0}
          max={1440}
          step={15}
          onChange={handleEndChange}
        >
          <SliderTrack bg="transparent">
            <SliderFilledTrack bg="blue.500" />
          </SliderTrack>
          <SliderThumb boxSize={6}>
            <Box color="black" fontSize="sm" fontWeight="bold">
              {formatTime(timeRange[1])}
            </Box>
          </SliderThumb>
        </Slider>
      </Box>

      <Text mt={4} fontSize="md">
        Intervall: {formatTime(timeRange[0])} - {formatTime(timeRange[1])}
      </Text>
    </Flex>
      </Flex>

      {/* Footer */}
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
  );
}

