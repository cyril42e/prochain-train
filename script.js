///##############################
/// Tools
///##############################

function getTimeAPI(datetime)
{
  return datetime.replace(/^[0-9]{4}[0-9]{1,2}[0-9]{1,2}T([0-9]{2})([0-9]{2})[0-9]{2}$/, "$1:$2");
}

function getTimeGEC(datetime)
{
  return datetime.replace(/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}T([0-9]{2}):([0-9]{2}):[0-9]{2}.*$/, "$1:$2");
}

function formatTE(el) { // format Time Element
  return el < 10 ? "0" + el : el;
}

function formatTimeHMS(time) {
  return formatTE(time.getHours()) + ":" + formatTE(time.getMinutes()) + ":" + formatTE(time.getSeconds());
}

function formatTimeHM(time) {
  return formatTE(time.getHours()) + ":" + formatTE(time.getMinutes());
}

function formatDateFile(date) {
  return date.getFullYear() + "-" + formatTE(date.getMonth()+1) + "-" + formatTE(date.getDate()) + "_" +
         formatTE(date.getHours()) + "-" + formatTE(date.getMinutes()) + "-" + formatTE(date.getSeconds());
}

function convertTimeGECtoAPI(datetime) {
  return datetime.replace(/[+-][0-9]{2}:[0-9]{2}$/, "").replace(/\-/g, "").replace(/:/g, "");
}

function dist(lat1, lon1, lat2, lon2) { // in km
  return Math.sqrt((lat1-lat2)**2 + ((lon1-lon2)*Math.cos(lat1*Math.PI/180.))**2)*(40000./360.);
}

function getWindDirectionArrow(degrees) {
  if (degrees === null || degrees === undefined) return '';
  
  // Normalize degrees to 0-360 range
  degrees = ((degrees % 360) + 360) % 360;
  
  // Convert to 8-direction compass with arrows pointing in wind direction
  if (degrees >= 337.5 || degrees < 22.5) return '↓';   // N (~0°, wind from north, blowing south)
  if (degrees >= 22.5 && degrees < 67.5) return '↙';    // NE (~45)
  if (degrees >= 67.5 && degrees < 112.5) return '←';   // E (~90°, wind from east, blowing west)
  if (degrees >= 112.5 && degrees < 157.5) return '↖';  // SE (~135°)
  if (degrees >= 157.5 && degrees < 202.5) return '↑';  // S (~180°, wind from south, blowing north)
  if (degrees >= 202.5 && degrees < 247.5) return '↗';  // SW (~225°)
  if (degrees >= 247.5 && degrees < 292.5) return '→';  // W (~270°, wind from west, blowing east)
  if (degrees >= 292.5 && degrees < 337.5) return '↘';  // NW (~315°)
  return '';
}

async function withTimeout(promise, timeout) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => { reject(new Error('Timeout')); }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    // the promise has been resolved before the timeout
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (error.message === 'Timeout') {
      // the timeout has elapsed first
      return null;
    } else {
      throw error;
    }
  }
}

// Generic retry mechanism for API calls
async function fetchWithRetry(fetchFunction, errorContext, id, attemptCount = 3, retryDelay = 500) {
  for (let attempt = 1; attempt <= attemptCount; attempt++) {
    try {
      const response = await fetchFunction();
      
      if (!response.ok) {
        throw new Error('Request error: ' + response.status);
      }

      const json_data = await response.json();
      display(id);
      return json_data;
    } catch (error) {
      display(`[!${id} ${errorContext}: ${error.message}]`);
      if (attempt === attemptCount) {
        return null;
      }
      // Wait for a short time before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Cache DOM elements - initialized when script loads
const statusElement = document.getElementById('status');

function display(el) {
  statusElement.append(el);
}


///##############################
/// Fetch json
///##############################

// fetch coordinates
function fetchCoords(timeout) {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: timeout });
    } else {
      reject(new Error("Geolocation API is not supported by this browser."));
    }
  });
}


// fetch json from official public API for single line
async function fetchDeparturesAPILine(line_id, station_id, count) {
  const token = config.sncf_token;
  const full_line_id = 'line:SNCF:FR:Line::' + line_id + ':';
  const full_station_id = 'stop_area:SNCF:' + station_id;

  // Url to retrieve departures
  const departuresUrl = 'https://api.sncf.com/v1/coverage/sncf/stop_areas/' + full_station_id + '/lines/' + full_line_id + '/departures?count=' + count;

  return await fetchWithRetry(
    () => fetch(departuresUrl, {
      method: 'GET',
      cache: "no-cache",
      headers: {
        'Authorization': 'Basic ' + btoa(token),
        'Content-Type': 'application/json'
      }
    }),
    station_id,
    'a',
    retryCount
  );
}

// fetch json from official public API for all lines of a station
async function fetchDeparturesAPI(lines_ids, station_id, count) {
  const promises = lines_ids.map(line_id => fetchDeparturesAPILine(line_id, station_id, count));
  const results = await Promise.all(promises);
  return results.filter(result => result !== null);
}


// fetch json from GEC (GareEtConnexions.sncf)
// another API, unofficial, that provides additional information
async function fetchDeparturesGEC(station_id) {
  // Url to retrieve departures
  var departuresUrl = 'www.garesetconnexions.sncf/schedule-table/Departures/00' + station_id;
  const cors_proxy = "/corsproxy/";
  const cors_proxy_vars = "?key=" + config.corsproxy_token;

  return await fetchWithRetry(
    () => fetch(cors_proxy + departuresUrl + cors_proxy_vars, {
      method: 'GET',
      cache: "no-cache",
      headers: {
        'Content-Type': 'application/json'
      }
    }),
    station_id,
    'g',
    retryCount
  );
}

// fetch rain json from MeteoFrance
async function fetchRain(lat, lon) {
  // Url to retrieve weather
  const token = config.meteofrance_token;
  rainUrl = 'https://webservice.meteofrance.com/v3/rain/?lat=' + lat + '&lon=' + lon + '&token=' + token;

  return await fetchWithRetry(
    () => fetch(rainUrl, {
      method: 'GET',
      cache: "no-cache",
      headers: {
        'Content-Type': 'application/json'
      }
    }),
    '',
    'r',
    retryCount
  );
}

// fetch temperature and wind json from MeteoFrance
async function fetchTemperature(lat, lon) {
  // Url to retrieve temperature and wind data
  const token = config.meteofrance_token;
  const temperatureUrl = 'https://webservice.meteofrance.com/v2/observation/?lat=' + lat + '&lon=' + lon + '&token=' + token;

  return await fetchWithRetry(
    () => fetch(temperatureUrl, {
      method: 'GET',
      cache: "no-cache",
      headers: {
        'Content-Type': 'application/json'
      }
    }),
    '',
    't',
    retryCount
  );
}


///##############################
/// Extract infos from json
///##############################

// get map of train number with useful infos
function extractCoords(position, coords) {
  if (position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const dm = dist(lat, lon, coords[0][1], coords[0][2]);
    const de = dist(lat, lon, coords[1][1], coords[1][2]);
    if (dm < de && dm < farThreshold)
      return ['sm', coords[0][1], coords[0][2]];
    else if (de < dm && de < farThreshold)
      return ['se', coords[1][1], coords[1][2]];
    else
      return ['', lat, lon];
  } else {
    if (now.getHours() < 12 != invert)
      return ['sm', coords[0][1], coords[0][2]];
    else
      return ['se', coords[1][1], coords[1][2]];
  }
}

// get map of train number with useful infos
function extractAPIInfos(jsons_data) {
  const results = new Map();
  if (jsons_data) {
    jsons_data.forEach(json_data => {
      json_data.departures.forEach(dep => {
        const result = new Map([
          ["btime", dep.stop_date_time.base_departure_date_time],
          ["atime", dep.stop_date_time.departure_date_time],
          ["dest", dep.display_informations.direction.replace(/ \(.*/g, "")],
          ["station", dep.stop_point.name]
        ]);
        results.set(dep.display_informations.headsign, result);
      });
      json_data.disruptions.forEach(dis => {
        const trainNumber = dis.impacted_objects[0].pt_object.trip.name;
        if (results.has(trainNumber)) {
          const message = dis.messages ? dis.messages[0].text : "?";
          results.get(trainNumber).set("disruption", message);
        }
      });
    });
  }
  return [results, jsons_data];
}


// get map of train number with useful infos
function extractGECInfos(json_data) {
  const results = new Map();
  
  if (json_data) {
    json_data.forEach(dep => {
      const result = new Map([
        ["btime", dep.scheduledTime],
        ["atime", dep.actualTime],
        ["track", dep.platform.track],
        ["dest",  dep.traffic.destination],
        ["station", dep.uic],
        ["mode", dep.trainMode],
        ["status", dep.informationStatus.trainStatus],
        ["delay", dep.informationStatus.delay]
      ]);
      if (dep.trainMode != "TRAIN") {
        result.set("disruption", dep.trainMode);
      }
      results.set(dep.trainNumber, result);
    });
  }
  return [results, json_data];
}


// get vector of rain forecast
function extractRainInfos(json_data) {
  const results = new Map();
  if (json_data && json_data.properties && json_data.properties.rain_product_available == 1) {
    results.set("rain_forecast", json_data.properties.forecast.map(fc => fc.rain_intensity));
    results.set("rain_time", json_data.properties.forecast[0].time);
    results.set("rain_location", json_data.properties.name);
  }
  return [results, json_data];
}

// get temperature and wind data
function extractTemperatureInfos(json_data) {
  const results = new Map();
  if (json_data && json_data.properties && json_data.properties.gridded) {
    const gridded = json_data.properties.gridded;
    results.set("temperature", gridded.T);
    results.set("wind_speed", gridded.wind_speed * 3.6); // m/s to km/h
    results.set("wind_direction", gridded.wind_direction);
    results.set("temperature_time", gridded.time);
  }
  return [results, json_data];
}


///##############################
/// Merge infos from json
///##############################

// merge rain and temperature data
function mergeWeather(rainData, temperatureData) {
  const mergedData = new Map();
  rainData[0].forEach((value, key) => mergedData.set(key, value));
  temperatureData[0].forEach((value, key) => mergedData.set(key, value));

  const mergedJsonData = {
    rain: rainData[1],
    temperature: temperatureData[1]
  };
  
  return [mergedData, mergedJsonData];
}

function mergeDepartures(dataAPI, dataGEC) {
  function mergeContent(contentAPI, contentGEC) {
    let result = new Map(contentAPI); // Create a copy of contentAPI
    for (const key of ["track", "status", "delay"]) {
      result.set(key, contentGEC.get(key));
    }
    if (contentGEC.get("track") == null) {
      result.set("track", "?");
    }
    const gec_atime = convertTimeGECtoAPI(contentGEC.get("atime"));
    if (contentAPI.get("atime").localeCompare(gec_atime)) {
      result.set("atime", gec_atime);
    }
    return result;
  }

  function compareContent(content1, content2) {
    return content1.get("atime").localeCompare(content2.get("atime"));
  }

  const mergedMap = new Map();
  const jsonDataMap = new Map();
  const listDest = new Set();
  let station = "";
  
  // Check if GEC data is available (not null/empty)
  const hasGECData = dataGEC && dataGEC[0] && dataGEC[0].size > 0;
  const hasAPIData = dataAPI && dataAPI[0] && dataAPI[0].size > 0;

  // browse dataAPI and merge content if in both (and build list of destinations)
  if (hasAPIData) {
    for (const [trainNumber, contentAPI] of dataAPI[0].entries()) {
      listDest.add(contentAPI.get("dest"));
      station = contentAPI.get("station");
      if (hasGECData && dataGEC[0].has(trainNumber)) {
        const contentGEC = dataGEC[0].get(trainNumber);
        const mergedContent = mergeContent(contentAPI, contentGEC);
        mergedMap.set(trainNumber, mergedContent);
      } else {
        let result = new Map(contentAPI);
        result.set("track", hasGECData ? "" : "#");
        mergedMap.set(trainNumber, result);
      }
    }
  }

  // browse dataGEC for orphans (that have same destination than in API), and add them
  if (hasGECData) {
    for (const [trainNumber, contentGEC] of dataGEC[0].entries()) {
      if (!dataAPI[0].has(trainNumber) && listDest.has(contentGEC.get("dest"))) {
        let result = new Map();
        for (const [key, value] of contentGEC) {
          if (key == "btime" || key == "atime") {
            result.set(key, convertTimeGECtoAPI(value));
          } else if (key == "station") {
            result.set(key, station);
          } else {
            result.set(key, value);
          }
        }
        mergedMap.set(trainNumber, result);
      }
    }
  }

  // resort by date
  const mergedArray = Array.from(mergedMap.entries());
  mergedArray.sort(([trainNumber1, content1], [trainNumber2, content2]) => {
    return compareContent(content1, content2);
  });
  const sortedMergedMap = new Map(mergedArray);

  // merge json_data
  const mergedJsonData = {
    "api.sncf.com": dataAPI[1],
    "garesetconnexions.sncf": dataGEC ? dataGEC[1] : null
  };

  return [sortedMergedMap, mergedJsonData];
}


///##############################
/// Display departure infos
///##############################

// Displays departures
function displayDepartures(data, direction_excludes, count, advanced) {
  if (!data || !data[0]) {
    return;
  }
  let ndisp = 0;
  let station = "";
  const results = [];
  for (const [key, dep] of data[0]) {
    // filter directions
    let right_direction = true;
    if (direction_excludes) {
      for (const excl of direction_excludes.split(';').filter(r => r !== '')) {
        if (dep.get("dest").toLowerCase().indexOf(excl.toLowerCase()) != -1) {
          right_direction = false;
          break;
        }
      }
    }

    // add departure
    if (right_direction && (ndisp < count))
    {
      const delay = (dep.get("atime") != dep.get("btime")); // could use ad.get("delay") too
      const suppressed = ((dep.get("status") || "").toLowerCase().indexOf("suppress") != -1);
      const cr = suppressed ? "real_suppressed" : (delay ? "real_delay" : "real_normal");
      const cs = (suppressed || delay) ? "scheduled_delay" : "scheduled_normal";

      const result = [[getTimeAPI(dep.get("atime")), cr],
                      [getTimeAPI(dep.get("btime")), cs],
                      [dep.get("track") || "", ""],
                      [dep.get("dest"), "truncate"]];
      if (dep.has("disruption")) {
        result.push(["(" + dep.get("disruption") + ")", "disruption"]);
      }
      results.push(result);
      ndisp++;
    }

    // get full station name
    station = dep.get("station");
  }

  // prepare download link
  const jsonString = JSON.stringify(data[1], null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // format results
  format_station(station, url, results);
}


// Display departures with GEC API for comparison purpose
function displayDeparturesGEC(data, direction_excludes) {
  if (!data || !data[0]) {
    return;
  }
  const results = [];
  let station = "";
  for (const [key, dep] of data[0]) {
    // filter directions
    let right_direction = true;
    if (direction_excludes) {
      for (const excl of direction_excludes.split(';').filter(r => r !== '')) {
        if (dep.get("dest").toLowerCase().indexOf(excl.toLowerCase()) != -1) {
          right_direction = false;
          break;
        }
      }
    }

    if (right_direction) {
      delay = (dep.get("atime") != dep.get("btime"));
      suppressed = ((dep.get("status") || "").toLowerCase().indexOf("suppress") != -1);
      cr = suppressed ? "real_suppressed" : (delay ? "real_delay" : "real_normal");
      cs = (suppressed || delay) ? "scheduled_delay" : "scheduled_normal";

      const result = [[getTimeGEC(dep.get("atime")), cr],
                      [getTimeGEC(dep.get("btime")), cs],
                      [dep.get("track"), ""],
                      [dep.get("dest"), ""],
                      [dep.get("delay"), ""],
                      [dep.get("status"), ""]]
      results.push(result);
      station = dep.get("station");
    }
  }

  format_station(station, "", results, "GEC");
}


///##############################
/// Format functions
///##############################

function format_title(level, innerHTML, suffix = "")
{
  const table = document.getElementById('tabletime' + suffix);
  const tr = table.insertRow(-1);
  const th = document.createElement('th');
  th.setAttribute('colSpan', '4');
  th.innerHTML = innerHTML;
  th.setAttribute('class', level === 1 ? 'section' : 'station');
  tr.appendChild(th);
}

function format_station(station, link, results, suffix = "")
{
  const table = document.getElementById('tabletime' + suffix);
  const link_html = advanced && link !== '' ? ` <a href="${link}" download="${station}_${formatDateFile(now)}.json">[1]</a>` : '';
  format_title(2, station + link_html, suffix);

  results.forEach(dep => {
    let tr = table.insertRow(-1);

    dep.forEach(entry => {
      if (entry[1] === "disruption") {
        tr = table.insertRow(-1);
      }
      const td = tr.insertCell();
      if (entry[1] === "disruption") {
        td.setAttribute('colSpan', '4');
      }
      if (entry[1] !== "") {
        td.setAttribute('class', entry[1]);
      }
      td.appendChild(document.createTextNode(entry[0]));
    });
  });
}

///##############################
/// Display weather
///##############################

function displayWeather(data)
{
  // section title
  var p = document.createElement('p');
  
  // temperature subtitle
  let titleText = "";
  if (data[0].get("temperature") !== null && data[0].get("temperature") !== undefined) {
    titleText += data[0].get("temperature") + " °C";
  }
  if (data[0].get("wind_speed") !== null && data[0].get("wind_speed") !== undefined) {
    titleText += " " + data[0].get("wind_speed").toFixed(0) + " km/h ";
  }
  if (data[0].get("wind_direction") !== null && data[0].get("wind_direction") !== undefined) {
    titleText += getWindDirectionArrow(data[0].get("wind_direction"));
  }
  if (data[0].get("temperature_time")) {
    let datebegin = new Date(data[0].get("temperature_time"));
    titleText += " @" + formatTimeHM(datebegin);
  }

  titleText += "<br/>";

  // rain subtitle
  titleText += "Pluie 1h";
  if (data[0].get("rain_time")) {
    let datebegin = new Date(data[0].get("rain_time"));
    datebegin.setMinutes(datebegin.getMinutes() - 5);
    titleText += " @" + formatTimeHM(datebegin);
  }
  
  if (data[0].get("rain_location")) {
    titleText += " @" + data[0].get("rain_location");
  }
  
  p.innerHTML = titleText;
  
  // prepare download link
  if (advanced) {
    p.appendChild(document.createTextNode(' '));
    const jsonString = JSON.stringify(data[1], null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'weather_' + data[0].get("rain_location") + '_' + formatDateFile(now) + '.json';
    a.appendChild(document.createTextNode('[1]'));
    p.append(a);
  }

  format_title(1, p.innerHTML);

  // display rain forecast
  const colormap = { 1: "#f6f7d5", 2:"#bfe1f7", 3:"#81a4f7", 4:"blue" };
  let table = document.getElementById('tabletime');

  let tr = table.insertRow(-1);
  let td = document.createElement('td');
  td.setAttribute('colSpan', '4');
  td.setAttribute('id', 'rain_container');
  let array = document.createElement("table");
  array.setAttribute('id', 'rain');
  let row = document.createElement("tr");

  if (data[0].get("rain_forecast")) {
    for (const [i, value] of data[0].get("rain_forecast").entries()) {
      let td = document.createElement("td");
      if (i >= 6) {
        td.setAttribute('colSpan', '2');
      }
      td.setAttribute('bgcolor', colormap[value]);
      row.appendChild(td);
    }
  } else {
    let td = document.createElement("td");
    let text = document.createTextNode("?");
    td.appendChild(text);
    row.appendChild(td);
  }

  array.appendChild(row);
  td.appendChild(array);
  table.appendChild(td);
}


///##############################
/// Main
///##############################

const now = new Date(Date.now());

const query = window.location.hash.substr(1);
const params = new URLSearchParams(query);
const count_display = params.has('count') ? params.get('count') : 3;
const count_request = count_display*4;
const advanced = params.get('advanced') == 1 ? true : false;
const invert = params.get('invert') == 1 ? true : false;
const farThreshold = 20.0; // distance in km to consider the user far from known stations and fetch weather only
const locationTimeout = params.has('lt') ? parseInt(params.get('lt')) : 300;
const retryCount = params.has('retry') ? parseInt(params.get('retry')) : 3;

let coords = [];
coords.push(['sm'].concat(params.get('rcm').split(',')));
coords.push(['se'].concat(params.get('rce').split(',')));

// read parameters and store them in an array
let stations = [];
for (const slot of ['m', 'e']) {
  let i = 1;
  station_slot = 's' + slot;
  line_slot = 'l' + slot;
  while (params.has(station_slot + i)) {
    stations.push([station_slot,
                   params.get(station_slot + i),
                   params.get(line_slot + i),
                   params.get(station_slot + i + 'x')])
    i++;
  }
}

// Fetch all data types in parallel for given coordinates and stations
async function fetchAllData(coords, targetStations, includeAPI = true, includeGEC = true, includeWeather = true) {
  // Create all promises (starts execution immediately)
  let promisesAPI = [], promisesGEC = [], promiseRain = null, promiseTemperature = null  
  if (includeAPI && targetStations.length > 0) {
    promisesAPI = targetStations.map(station => fetchDeparturesAPI(station[2].split(';'), station[1], count_request));
  }
  if (includeGEC && targetStations.length > 0) {
    promisesGEC = targetStations.map(station => fetchDeparturesGEC(station[1]));
  }
  if (includeWeather) {
    promiseRain = fetchRain(coords[1], coords[2]);
    promiseTemperature = fetchTemperature(coords[1], coords[2]);
  }
  
  // Wait for results (execution was already parallel)
  let resultsAPI = [], resultsGEC = [], resultRain = null, resultTemperature = null;
  if (promisesAPI.length > 0) {
    resultsAPI = await Promise.all(promisesAPI);
  }
  if (promisesGEC.length > 0) {
    resultsGEC = await Promise.all(promisesGEC);
  }
  if (promiseRain) {
    resultRain = await promiseRain;
  }
  if (promiseTemperature) {
    resultTemperature = await promiseTemperature;
  }
  
  return { resultsAPI, resultsGEC, resultRain, resultTemperature };
}

async function processCoords(promise, type, timeout, stations) {
  const errors = ['Success', 'Denied', 'Unavailable', 'Timeout'];
  let dataCoords, pendingCoords = false, filteredStations = [];
  const filterStations = (dataCoords) => { filteredStations = stations.filter((station) => station[0] == dataCoords[0]); };
  try {
    display(`Trying ${type} coordinates... `);
    const resultCoords = await withTimeout(promise, timeout);
    dataCoords = extractCoords(resultCoords, coords);
    if (resultCoords) {
      // fetch coordinates succeeded
      display(`Success ${dataCoords[1]},${dataCoords[2]}`);
      if (dataCoords[0] == '')
        filteredStations = [];
      else
        filterStations(dataCoords);
    } else {
      // fetch coordinates had timeout
      pendingCoords = true;
      display(`Timeout`);
      filterStations(dataCoords);
    }
  } catch(error) {
    // fetch coordinates failed
    dataCoords = extractCoords(null, coords);
    display(`Failure (${errors[error.code] || error.message})`);
    pendingCoords = error.code == 3; // 3 = Timeout
    filterStations(dataCoords);
  }
  return [dataCoords, pendingCoords, filteredStations];
}

async function displayStations() {
  // start geolocation (with safety timeout)
  const promiseCoords = fetchCoords(10000); // 10 seconds
  
  // First let's see if we get location within user timeout
  let [coords, pendingCoords, filteredStations] = await processCoords(promiseCoords, "fast", locationTimeout, stations);

  // Fetch data for the determined location (actual or guessed)
  try {
    display(document.createElement("br"));
    display(`Fetching data... `);
    let { resultsAPI, resultsGEC, resultRain, resultTemperature } = await fetchAllData(coords, filteredStations);
    display(" Finished");

    // If location was pending, check if actual location arrived and differs
    if (pendingCoords) {
      display(document.createElement("br"));
      let firstCoords = coords;
      [coords, pendingCoords, filteredStations] = await processCoords(promiseCoords, "final", 0, stations);
      if (coords[0] !== firstCoords[0]) {
        // location guess was wrong, need to fetch correct data
        display(document.createElement("br"));
        display("Fetching correct data... ");
        if (coords[0] !== '') {
          // actual location is near a known station, fetch all data types in parallel
          ({resultsAPI, resultsGEC, resultRain, resultTemperature} = await fetchAllData(coords, filteredStations));
        } else {
          // actual location is far from known stations, only fetch weather
          ({resultsAPI, resultsGEC, resultRain, resultTemperature} = await fetchAllData(coords, [], false, false, true));
        }
        display(" Finished");
      }
    }

    // process and display results
    const all_dataAPI = resultsAPI.map(json_data => extractAPIInfos(json_data));
    const all_dataGEC = resultsGEC.map(json_data => extractGECInfos(json_data));
    const all_dataMerged = all_dataAPI.map((dataAPI, index) => {
      const dataGEC = all_dataGEC[index];
      return mergeDepartures(dataAPI, dataGEC);
    });
    
    format_title(1, "Prochains trains à " + formatTimeHMS(now));
    all_dataMerged.forEach((dataMerged, index) => displayDepartures(dataMerged, filteredStations[index][3], count_display, advanced));
    if (advanced)
      all_dataGEC.forEach((dataGEC, index) => displayDeparturesGEC(dataGEC, null));

    const dataRain = extractRainInfos(resultRain);
    const dataTemperature = extractTemperatureInfos(resultTemperature);
    const mergedWeatherData = mergeWeather(dataRain, dataTemperature);
    displayWeather(mergedWeatherData);

    if (!advanced) {
      statusElement.innerHTML = "";
    }

  } catch (error) {
    display(`Error (${error.message})`);
  }
}

displayStations();


