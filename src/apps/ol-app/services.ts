// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { MapConfig, MapConfigProvider, SimpleLayer } from "@open-pioneer/map";
import TileLayer from "ol/layer/Tile";
import TileWMS from 'ol/source/TileWMS.js';

export const MAP_ID = "main";

    var basemapWMS = new TileLayer({
        source: new TileWMS({
        url: 'https://sgx.geodatenzentrum.de/wms_basemapde',
        params: {
            'LAYERS': 'de_basemapde_web_raster_farbe',
            'STYLES': 'default',
            'FORMAT': 'image/png',
            'TILED': true
        },
        projection: 'EPSG:3857',
        attributions: 'Kartendaten &copy; <a href="https://www.basemap.de/">basemap.de</a>'
        })
    });

    const simpleLayer = new SimpleLayer({
        title: "Baseamap",
        olLayer: basemapWMS,
        isBaseLayer: true
    })
export class MainMapProvider implements MapConfigProvider {
    mapId = MAP_ID;

    async getMapConfig(): Promise<MapConfig> {
        return {
            initialView: {
                kind: "position",
                center: { x: 847541, y: 6793584 },
                zoom: 14
            },
            projection: "EPSG:3857",
            layers: [
                simpleLayer
            ]
        };
    }
}
