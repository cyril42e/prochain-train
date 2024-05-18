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

function formatTime(time) {
  return formatTE(now.getHours()) + ":" + formatTE(now.getMinutes()) + ":" + formatTE(now.getSeconds());
}

function formatDateFile(date) {
  return date.getFullYear() + "-" + formatTE(date.getMonth()+1) + "-" + formatTE(date.getDate()) + "_" +
         formatTE(date.getHours()) + "-" + formatTE(date.getMinutes()) + "-" + formatTE(date.getSeconds());
}

function convertTimeGECtoAPI(datetime) {
  return datetime.replace(/[+-][0-9]{2}:[0-9]{2}$/, "").replace(/\-/g, "").replace(/:/g, "");
}


///##############################
/// Fetch json
///##############################

// fetch json from official public API
async function fetchDeparturesAPI(line_id, station_id, count)
{
  const token = "cbfb30d4-a3b4-472e-9657-6ee4319e0501";
  const full_line_id = 'line:SNCF:FR:Line::' + line_id + ':';
  const full_station_id = 'stop_area:SNCF:' + station_id;

  // Url to retrieve departures
  var departuresUrl = 'https://api.sncf.com/v1/coverage/sncf/stop_areas/' + full_station_id + '/lines/' + full_line_id + '/departures?count=' + count;

  // Call Navitia API
  try {
    const response = await fetch(departuresUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(token),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Request error: ' + response.status);
    }

    const json_data = await response.json();
    return json_data;
  } catch (error) {
    alert('Error : ' + error.message);
  }
}


// fetch json from GEC (GareEtConnexions.sncf)
// another API, unofficial, that provides additional information
async function fetchDeparturesGEC(station_id)
{
  // Url to retrieve departures
  var departuresUrl = 'https://www.garesetconnexions.sncf/schedule-table/Departures/00' + station_id;
  const cors_proxy = "https://api.allorigins.win/raw?url=";

  // Call API
  try {
    const response = await fetch(cors_proxy + encodeURIComponent(departuresUrl), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Request error: ' + response.status);
    }

    const json_data = await response.json();
    return json_data;
  } catch (error) {
    alert('Error : ' + error.message);
  }
}

// fetch coordinates if available
function fetchCoords()
{
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2000 });
    } else {
      reject(new Error("Geolocation API is not supported by this browser."));
    }
  });
}

// fetch weather json from MeteoFrance
async function fetchWeather(lat, lon)
{
  // get coordinates first
  let d = document.getElementById('coords');
  d.append(document.createTextNode("Pluie 1h @"));
  try {
    const position = await fetchCoords();
    lat = position.coords.latitude;
    lon = position.coords.longitude;
    d.append(document.createTextNode(`cur `));
  } catch (error) {
    d.append(document.createTextNode("def" + (advanced ? `(${error.code}) ` : " ")));
  }
  let a = document.createElement('a');
  a.href = `https://www.google.fr/maps/search/?api=1&query=${lat},${lon}`;
  a.appendChild(document.createTextNode(`${lat},${lon}`));
  d.append(a);

  // Url to retrieve weather
  const token = "__Wj7dVSTjV9YGu1guveLyDq0g7S7TfTjaHBTPTpO0kj8__";
  rainUrl = 'https://webservice.meteofrance.com/v3/rain/?lat=' + lat + '&lon=' + lon + '&token=' + token;

  // Call API
  try {
    const response = await fetch(rainUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Request error: ' + response.status);
    }

    const json_data = await response.json();

    // prepare download link
    if (advanced) {
      const jsonString = JSON.stringify(json_data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'rain_' + lat + ',' + lon + '_' + formatDateFile(now) + '.json';
      a.appendChild(document.createTextNode('[1]'));
      d.append(document.createTextNode(' '));
      d.append(a);
    }

    return json_data;
  } catch (error) {
    alert('Error : ' + error.message);
  }
}


///##############################
/// Extract infos from json
///##############################

// get map of train number with useful infos
function extractAPIInfos(json_data) {
  const results = new Map();
  $.each(json_data.departures, function(i, dep) {
    result = new Map([["btime", dep.stop_date_time.base_departure_date_time],
                      ["atime", dep.stop_date_time.departure_date_time],
                      ["dest", dep.display_informations.direction.replace(/ \(.*/g, "")],
                      ["station", dep.stop_point.name]]);
    results.set(dep.display_informations.headsign, result);
  });
  $.each(json_data.disruptions, function(i, dis) {
    const trainNumber = dis.impacted_objects[0].pt_object.trip.name;
    if (results.has(trainNumber)) {
      results.get(trainNumber).set("disruption", dis.messages[0].text);
    }
  });
  return [results, json_data];
}


// get map of train number with useful infos
function extractGECInfos(json_data) {
  const results = new Map();
  $.each(json_data, function(i, dep) {
    result = new Map([["btime", dep.scheduledTime],
                      ["atime", dep.actualTime],
                      ["track", dep.platform.track],
                      ["dest",  dep.traffic.destination],
                      ["station", dep.uic],
                      ["status", dep.informationStatus.trainStatus],
                      ["delay", dep.informationStatus.delay]]);
    results.set(dep.trainNumber, result);
  });
  return [results, json_data];
}


// get vector of rain forecast
function extractWeatherInfos(json_data) {
  const results = (json_data.properties.rain_product_available != 1)
    ? [0, 0, 0, 0, 0, 0, 0, 0, 0]
    : json_data.properties.forecast.map(fc => fc.rain_intensity);
  return [results, json_data];
}


///##############################
/// Merge infos from json
///##############################

function mergeInfos(dataAPI, dataGEC) {
  function mergeContent(contentAPI, contentGEC) {
    result = contentAPI;
    for (const key of ["track", "status", "delay"]) {
      result.set(key, contentGEC.get(key));
    }
    if (contentGEC.get("track") == "") {
      result.set("track", "?");
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

  // browse dataAPI and merge content if in both (and build list of destinations)
  for (const [trainNumber, contentAPI] of dataAPI[0].entries()) {
    listDest.add(contentAPI.get("dest"));
    station = contentAPI.get("station");
    if (dataGEC[0].has(trainNumber)) {
      const contentGEC = dataGEC[0].get(trainNumber);
      const mergedContent = mergeContent(contentAPI, contentGEC);
      mergedMap.set(trainNumber, mergedContent);
    } else {
      mergedMap.set(trainNumber, contentAPI);
    }
  }

  // browse dataGEC for orphans (that have same destination than in API), and add them
  for (const [trainNumber, contentGEC] of dataGEC[0].entries()) {
    if (!dataAPI[0].has(trainNumber) && listDest.has(contentGEC.get("dest"))) {
      result = new Map();
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

  // resort by date
  const mergedArray = Array.from(mergedMap.entries());
  mergedArray.sort(([trainNumber1, content1], [trainNumber2, content2]) => {
    return compareContent(content1, content2);
  });
  const sortedMergedMap = new Map(mergedArray);

  // merge json_data
  const mergedJsonData = {
    "api.sncf.com": dataAPI[1],
    "garesetconnexions.sncf": dataGEC[1]
  };

  return [sortedMergedMap, mergedJsonData];
}


///##############################
/// Display departure infos
///##############################

// Displays departures
function displayDepartures(data, direction_excludes, count, format, advanced) {
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
      delay = (dep.get("atime") != dep.get("btime")); // could use ad.get("delay") too
      suppressed = ((dep.get("status") || "").toLowerCase().indexOf("suppress") != -1);
      cr = suppressed ? "real_suppressed" : (delay ? "real_delay" : "real_normal");
      cs = (suppressed || delay) ? "scheduled_delay" : "scheduled_normal";

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
  format(station, url, results);
}


// Display departures with GEC API for comparison purpose
function displayDeparturesGEC(data, direction_excludes, format) {
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

  format(station, "", results, "GEC");
}


///##############################
/// Format functions
///##############################

function format_list(station, link, results, suffix = "")
{
  link_html = ' <a href="' + link + '" download="' + station + '_' + formatDateFile(now) + '.json">[1]</a>';
  $(document.body).append('<h3>' + station + (advanced ? link_html : '') + ':</h3>');
  var $ul = $('<ul>');
  $(document.body).append($ul);

  $.each(results, function(i, dep) {
    var $li = $('<li>');

    s = "";
    $.each(dep, function(j, entry) {
      if (entry[1] == "") {
        s += entry[0] + ' ';
      } else {
        s += '<span class=' + entry[1] + '>' + entry[0] + '</span> ';
      }
    });

    $li.html(s);
    $ul.append($li);
  });
}

function format_table(station, link, results, suffix = "")
{
  let table = document.getElementById('tabletime' + suffix);

  let tr = table.insertRow(-1);
  let th = document.createElement('th');
  th.setAttribute('colSpan', '4');
  link_html = ' <a href="' + link + '" download="' + station + '_' + formatDateFile(now) + '.json">[1]</a>';
  th.innerHTML = station + ((advanced && link != "") ? link_html : '');
  tr.appendChild(th);

  $.each(results, function(i, dep) {
    let tr = table.insertRow(-1);

    $.each(dep, function(j, entry) {
      if (entry[1] == "disruption")
        tr = table.insertRow(-1);
      let td = tr.insertCell();
      if (entry[1] == "disruption")
        td.setAttribute('colSpan', '4')
      if (entry[1] != "")
        td.setAttribute('class', entry[1]);
      td.appendChild(document.createTextNode(entry[0]));
    });
  });
}

///##############################
/// Display weather
///##############################

function displayWeather(data)
{
  const colormap = { 0: "white", 1: "#f6f7d5", 2:"#bfe1f7", 3:"#81a4f7", 4:"blue" };
  let table = document.getElementById('tabletime');

  let tr = table.insertRow(-1);
  let td = document.createElement('td');
  td.setAttribute('colSpan', '4');
  td.setAttribute('id', 'rain_container');
  let array = document.createElement("table");
  array.setAttribute('id', 'rain');
  let row = document.createElement("tr");

  for (const [i, value] of data[0].entries()) {
    let td = document.createElement("td");
    //let text = document.createTextNode("x");
    //td.appendChild(text);
    if (i >= 6) {
      td.setAttribute('colSpan', '2');
    }
    td.setAttribute('bgcolor', colormap[value]);
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

const query = window.location.search;
const params = new URLSearchParams(query);
const line = params.get('line');
const count_display = params.has('count') ? params.get('count') : 3;
const count_request = count_display*4;
const format = params.get('format') == 'list' ? format_list : format_table;
const advanced = params.get('advanced') == 1 ? true : false;
const invert = params.get('invert') == 1 ? true : false;
const rcm = params.get('rcm').split(',');
const rce = params.get('rce').split(',');

async function displayStations(slot, rc) {
  // read parameters and store them in an array
  let i = 1;
  let stations = [];
  while (params.has(slot + i)) {
    stations.push([params.get(slot + i), params.get(slot + i + 'x')])
    i++;
  }

  // fetch them all asynchronously but in the same order
  try {
    const promisesAPI = stations.map(station => fetchDeparturesAPI(line, station[0], count_request));
    const promisesGEC = stations.map(station => fetchDeparturesGEC(station[0]));
    const promiseWeather = fetchWeather(rc[0], rc[1]);
    const resultsAPI = await Promise.all(promisesAPI);
    const resultsGEC = await Promise.all(promisesGEC);
    const all_dataAPI = resultsAPI.map(json_data => extractAPIInfos(json_data));
    const all_dataGEC = resultsGEC.map(json_data => extractGECInfos(json_data));
    const all_dataMerged = all_dataAPI.map((dataAPI, index) => {
      const dataGEC = all_dataGEC[index];
      return mergeInfos(dataAPI, dataGEC);
    });
    all_dataMerged.forEach((dataMerged, index) => displayDepartures(dataMerged, stations[index][1], count_display, format, advanced));
    if (advanced)
      all_dataGEC.forEach((dataGEC, index) => displayDeparturesGEC(dataGEC, null, format));

    const resultWeather = await promiseWeather;
    const dataWeather = extractWeatherInfos(resultWeather);
    displayWeather(dataWeather);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

if (now.getHours() < 12 != invert) {
  displayStations('sm', rcm); // morning
} else {
  displayStations('se', rce); // evening
}

//displayWeather([0,1,2,3,4,1,2,3,4]);

document.body.prepend(document.createTextNode("Prochains trains à " + formatTime(now)));

