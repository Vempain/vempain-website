# Music and GPS data embeds

This document describes how to use the new dataset-backed embeds end-to-end after data has been published from Vempain
File -> Vempain Admin -> Vempain Website.

## Supported embeds

Two new embeds are available in the Vempain Admin page editor:

1. **Music** – renders a searchable, sortable table of published music rows.
2. **GPS** – renders a map of published GPS time-series data using `react-leaflet`.

## Editor workflow in Vempain Admin

Open a page in the Admin page editor and use the Rich Text Editor toolbar.

### Music embed

1. Click **Music** in the embed toolbar.
2. Confirm or edit the dataset identifier.
    - Default identifier: `music_library`
3. Save the page.

Generated embed tag example:

```html
<!--vps:embed:music:music_library-->
```

### GPS time-series embed

1. Click **GPS** in the embed toolbar.
2. Choose a dataset from the list.
    - The selector is filtered to datasets with:
        - `type=time_series`
        - identifier prefix `gps_timeseries_`
3. Save the page.

Generated embed tag example:

```html
<!--vps:embed:gps_timeseries:gps_timeseries_holidays_2024-->
```

## Website behaviour

### Music embed rendering

The website frontend calls:

- `GET /api/public/embeds/music/{identifier}`

Features:

- server-side pagination
- server-side sorting
- free-text search across artist, album artist, album, track, genre, year, and duration

What the user should see:

- a table with sortable column headers
- a search box above the table
- pagination controls below the table

### GPS embed rendering

The website frontend calls:

- `GET /api/public/embeds/gps/{identifier}/overview`
- `GET /api/public/embeds/gps/{identifier}/clusters`
- `GET /api/public/embeds/gps/{identifier}/clusters/{clusterKey}/points`
- `GET /api/public/embeds/gps/{identifier}/track`

Features:

- initial map bounds automatically fit the published GPS dataset
- visible green polyline track path connecting sampled points in timestamp order
- backend-driven clustering for zoomed-out views
- viewport-based loading when the user pans or zooms the map
- cluster expansion on click to fetch and show individual GPS points

What the user should see:

- the map opens centered on the full dataset area
- a green route line is visible for the trip track
- zooming out shows blue cluster markers with point counts
- clicking a cluster loads red point markers for that cluster
- moving the map loads clusters only for the current visible area

## Verification checklist

### 1. Publish the datasets

From the File backend or frontend, publish:

- music dataset -> `music_library`
- one or more GPS time-series datasets -> `gps_timeseries_<path>`

### 2. Insert embeds into a page

In Admin:

- add a **Music** embed to a test page
- add a **GPS** embed and pick a known GPS dataset
- save and publish the page to the website

### 3. Verify the music embed on the website

Check that:

- the table loads rows
- sorting by columns changes the order
- searching filters the result set
- pagination loads additional pages

Recommended manual checks:

- sort by `Artist`
- sort by `Year`
- search for a known artist or album
- confirm pagination works with more than one page of data

### 4. Verify the GPS embed on the website

Check that:

- the map opens to the correct geographic bounds
- the track polyline is visible and follows the trip route
- zoomed-out views show clusters instead of every point
- clicking a cluster loads detailed points
- panning/zooming refreshes the visible-area data

Recommended manual checks:

- start at the initial zoom and verify the overall trip area is visible
- zoom out until clustering appears
- click a cluster and verify detailed markers are rendered
- pan to another area and confirm the cluster set updates

## Configuration notes

### Music

- embed identifier must match a published tabular dataset with the expected music columns
- default dataset: `music_library`

### GPS

- identifier must match a published GPS time-series dataset
- current selector intentionally prefers identifiers beginning with `gps_timeseries_`
- backend clustering is grid-based and depends on current zoom level and viewport bounds
- cluster expansion fetches a capped point set for the chosen cluster cell

## Troubleshooting

### Music embed shows an error

Possible causes:

- dataset not yet published to the website database
- dataset identifier in the embed tag is wrong
- published table does not contain the expected music columns

### GPS embed shows an error or empty map

Possible causes:

- dataset not yet published to the website database
- dataset identifier in the embed tag is wrong
- published table does not contain the expected GPS columns
- dataset has no rows with usable latitude/longitude values

## Quick examples

### Example editor placeholders

- Music placeholder label in editor:
    - `🎼 music:music_library`
- GPS placeholder label in editor:
    - `🗺 gps:gps_timeseries_holidays_2024`

### Example website result

- Music embed: searchable table of tracks
- GPS embed: map with cluster counts at low zoom and detailed points after cluster expansion

