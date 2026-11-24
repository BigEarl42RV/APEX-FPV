# Return the Difference in Elevation Along a Path Between Two or More Sets of Latitude/Longitude Coordinates

## Overview

The Maps JavaScript API `ElevationService` provides elevation data for locations
on the surface of the earth, including depth locations on the ocean floor (which
return negative values). Where Google does not possess exact elevation
measurements at a precise location, the service interpolates and returns an
averaged value using the four nearest locations.

Using the `ElevationService.getElevationAlongPath()` method, you can request
sampled elevation data along an ordered set of connected path vertices. This
divides the given path into an ordered set of equidistant sample points
(inclusive of the endpoints), allowing you to calculate elevation differences,
total elevation gain/loss, or render elevation profiles along routes.

## Prerequisites

Before using the Elevation service in the Maps JavaScript API, ensure that the
**Elevation API** is enabled in the Google Cloud Console inside the same project
used for your Maps JavaScript API key.

To verify and enable the Elevation API:

1.  Go to the
    [Google Cloud console](https://console.cloud.google.com/project/_/apiui/apis/enabled?utm_source=Docs_EnabledAPIsView).
2.  Select the project configured for your Maps JavaScript API implementation.
3.  Check the list of enabled APIs on the **Dashboard** for **Elevation API**.
4.  If it is not listed, click **ENABLE API** (or navigate to the **Library**
    tab), search for **Elevation API**, and click **ENABLE**.

## Implementation Workflow

### 1. Load the Required Libraries

Load the `elevation` library (and `maps` if rendering a map or polyline) using
`google.maps.importLibrary()`.

```javascript
const [{ Map, Polyline }, { ElevationService }] = await Promise.all([
  google.maps.importLibrary("maps"),
  google.maps.importLibrary("elevation"),
]);
```

### 2. Construct a `PathElevationRequest`

A `PathElevationRequest` object literal requires two parameters:

-   `path` (required): An array of two or more ordered `LatLng` or
    `LatLngLiteral` objects (`{ lat, lng }`) defining the vertices of the path
    on the earth.
-   `samples` (required): A `number` specifying how many equidistant sample
    points along the length of the path (inclusive of endpoints) to query for
    elevation data.

```javascript
const pathRequest = {
  path: [
    { lat: 36.579, lng: -118.292 }, // Mt. Whitney
    { lat: 36.606, lng: -118.0638 }, // Lone Pine
    { lat: 36.24, lng: -116.832 },  // Badwater, Death Valley
  ],
  samples: 256,
};
```

### 3. Execute the Request and Process `ElevationResult` Data

Instantiate `ElevationService` and call `getElevationAlongPath()`. The method
returns a Promise that resolves with a `PathElevationResponse` containing an
array of `ElevationResult` objects (`results`), or accepts a callback returning
`(results, status)`.

Each `ElevationResult` object contains:

-   `location`: A `LatLng` object of the sampled point along the path.
-   `elevation`: A `number` indicating the elevation at that point in meters.
-   `resolution`: A `number` indicating the maximum distance (in meters) between
    data points from which the elevation was interpolated. (Note: Elevation data
    becomes coarser when multiple points are requested).

## Code Examples

### Calculating Elevation Differences Along a Path (Modern `importLibrary` Pattern)

The following example demonstrates how to request sampled elevation data along a
path, calculate the net elevation difference between the start and end points,
compute cumulative elevation gain and loss across all samples, and draw the path
on a map.

```html
<!-- HTML Map Element with Usage Attribution -->
<gmp-map
  center="36.5,-117.5"
  zoom="8"
  map-id="DEMO_MAP_ID"
  internal-usage-attribution-ids="gmp_git_agentskills_v1"
  style="height: 400px; width: 100%;"
></gmp-map>
<div id="elevation-summary"></div>
```

```javascript
async function calculatePathElevationDifferences() {
  const [{ Polyline }, { ElevationService }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("elevation"),
  ]);

  const mapElement = document.querySelector("gmp-map");
  const innerMap = mapElement.innerMap;
  innerMap.setMapTypeId("terrain");

  // Define two or more ordered coordinates along the path
  const path = [
    { lat: 36.579, lng: -118.292 }, // Mt. Whitney
    { lat: 36.606, lng: -118.0638 }, // Lone Pine
    { lat: 36.433, lng: -117.951 }, // Owens Lake
    { lat: 36.588, lng: -116.943 }, // Beatty Junction
    { lat: 36.34, lng: -117.468 }, // Panama Mint Springs
    { lat: 36.24, lng: -116.832 }, // Badwater, Death Valley
  ];

  // Draw the polyline on the map
  new Polyline({
    path: path,
    strokeColor: "#0000CC",
    strokeOpacity: 0.6,
    map: innerMap,
  });

  const elevator = new ElevationService();

  try {
    // Request 256 equidistant samples along the path
    const { results } = await elevator.getElevationAlongPath({
      path: path,
      samples: 256,
    });

    if (!results || results.length < 2) {
      document.getElementById("elevation-summary").textContent =
        "Insufficient elevation results returned.";
      return;
    }

    const startElevation = results[0].elevation;
    const endElevation = results[results.length - 1].elevation;
    const netElevationDiff = endElevation - startElevation;

    let totalGain = 0;
    let totalLoss = 0;

    // Calculate step-by-step elevation differences along the sampled points
    for (let i = 1; i < results.length; i++) {
      const stepDiff = results[i].elevation - results[i - 1].elevation;
      if (stepDiff > 0) {
        totalGain += stepDiff;
      } else {
        totalLoss += Math.abs(stepDiff);
      }
    }

    const formatter = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    });

    document.getElementById("elevation-summary").innerHTML = `
      <strong>Start Elevation:</strong> ${formatter.format(startElevation)} m<br>
      <strong>End Elevation:</strong> ${formatter.format(endElevation)} m<br>
      <strong>Net Elevation Difference:</strong> ${formatter.format(netElevationDiff)} m<br>
      <strong>Cumulative Gain:</strong> +${formatter.format(totalGain)} m<br>
      <strong>Cumulative Loss:</strong> -${formatter.format(totalLoss)} m
    `;
  } catch (error) {
    document.getElementById("elevation-summary").textContent =
      `Elevation service failed due to: ${String(error)}`;
  }
}

void calculatePathElevationDifferences();
```

--------------------------------------------------------------------------------

### Plotting an Elevation Profile Along a Path (TypeScript / Visualization API)

The following complete sample constructs a polyline given a set of coordinates
and plots the elevation differences across 256 equidistant samples along that
path using the [Google Visualization API](https://developers.google.com/chart).

Source:
[https://github.com/googlemaps/js-samples/blob/HEAD/samples/elevation-paths/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/elevation-paths/index.ts?utm_campaign=gmp_git_agentskills_v1)

```typescript
// Load the Visualization API and the columnchart package.
// @ts-ignore TODO update to newest visualization library
google.load("visualization", "1", { packages: ["columnchart"] });

function initMap(): void {
  // The following path marks a path from Mt. Whitney, the highest point in the
  // continental United States to Badwater, Death Valley, the lowest point.
  const path = [
    { lat: 36.579, lng: -118.292 }, // Mt. Whitney
    { lat: 36.606, lng: -118.0638 }, // Lone Pine
    { lat: 36.433, lng: -117.951 }, // Owens Lake
    { lat: 36.588, lng: -116.943 }, // Beatty Junction
    { lat: 36.34, lng: -117.468 }, // Panama Mint Springs
    { lat: 36.24, lng: -116.832 },
  ]; // Badwater, Death Valley

  const map = new google.maps.Map(
    document.getElementById("map") as HTMLElement,
    {
      zoom: 8,
      center: path[1],
      mapTypeId: "terrain",
      internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
    }
  );

  // Create an ElevationService.
  const elevator = new google.maps.ElevationService();

  // Draw the path, using the Visualization API and the Elevation service.
  displayPathElevation(path, elevator, map);
}

function displayPathElevation(
  path: google.maps.LatLngLiteral[],
  elevator: google.maps.ElevationService,
  map: google.maps.Map
) {
  // Display a polyline of the elevation path.
  new google.maps.Polyline({
    path: path,
    strokeColor: "#0000CC",
    strokeOpacity: 0.4,
    map: map,
  });

  // Create a PathElevationRequest object using this array.
  // Ask for 256 samples along that path.
  // Initiate the path request.
  elevator
    .getElevationAlongPath({
      path: path,
      samples: 256,
    })
    .then(plotElevation)
    .catch((e) => {
      const chartDiv = document.getElementById(
        "elevation_chart"
      ) as HTMLElement;

      // Show the error code inside the chartDiv.
      chartDiv.innerHTML = "Cannot show elevation: request failed because " + e;
    });
}

// Takes an array of ElevationResult objects, draws the path on the map
// and plots the elevation profile on a Visualization API ColumnChart.
function plotElevation({ results }: google.maps.PathElevationResponse) {
  const chartDiv = document.getElementById("elevation_chart") as HTMLElement;

  // Create a new chart in the elevation_chart DIV.
  const chart = new google.visualization.ColumnChart(chartDiv);

  // Extract the data from which to populate the chart.
  // Because the samples are equidistant, the 'Sample'
  // column here does double duty as distance along the
  // X axis.
  const data = new google.visualization.DataTable();

  data.addColumn("string", "Sample");
  data.addColumn("number", "Elevation");

  for (let i = 0; i < results.length; i++) {
    data.addRow(["", results[i].elevation]);
  }

  // Draw the chart using the data within its DIV.
  chart.draw(data, {
    height: 150,
    legend: "none",
    // @ts-ignore TODO update to newest visualization library
    titleY: "Elevation (m)",
  });
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
```

## Handling Elevation Statuses and Errors

Each elevation request returns an `ElevationStatus` code (accessible in the
callback or as the rejection reason in a Promise). Always handle potential error
states:

`ElevationStatus`  | Description
:----------------- | :----------
`OK`               | The service request was successful.
`INVALID_REQUEST`  | The service request was malformed (e.g., fewer than 2 coordinates in `path` or missing `samples`).
`OVER_QUERY_LIMIT` | The requestor has exceeded quota.
`REQUEST_DENIED`   | The service did not complete the request, likely due to an invalid parameter or the Elevation API not being enabled in the Cloud Console.
`UNKNOWN_ERROR`    | An unknown server error occurred.

## Important Considerations & Policies

-   **Sampling vs. Vertices**: Unlike `getElevationForLocations()` which returns
    elevation at exact input coordinates, `getElevationAlongPath()` samples
    *along the length of the path* at equidistant intervals (inclusive of the
    start and end points). Intermediate vertices in the `path` array define the
    geometry of the path but are not guaranteed to be the exact sample points
    unless a sample falls directly on them.
-   **Resolution Coarseness**: When passing multiple coordinates or requesting
    multiple path samples, the accuracy of returned data may be of lower
    resolution (larger `resolution` values in meters) than when requesting data
    for a single coordinate independently.
-   **Pricing and Policies**: Usage of the JavaScript Elevation service is
    subject to the
    [Elevation API Usage and Billing](https://developers.google.com/maps/documentation/elevation/usage-and-billing)
    and must comply with the
    [Elevation API Policies](https://developers.google.com/maps/documentation/elevation/policies).
