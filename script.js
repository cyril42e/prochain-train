
function getTimeAPI(datetime)
{
  return datetime.replace(/^[0-9]{4}[0-9]{1,2}[0-9]{1,2}T([0-9]{2})([0-9]{2})[0-9]{2}$/, "$1:$2");
}

function getTimeGEC(datetime)
{
  return datetime.replace(/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}T([0-9]{2}):([0-9]{2}):[0-9]{2}.*$/, "$1:$2");
}


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

    const data = await response.json();
    return data;
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

    const data = await response.json();
    return data;
  } catch (error) {
    alert('Error : ' + error.message);
  }
}



// Displays departures
function displayDepartures(data, direction_excludes, count, format, additionalData, advanced) {
  let ndisp = 0;
  let station = "";
  const results = [];
  $.each(data.departures, function(i, dep) {

    // filter directions
    let right_direction = true;
    if (direction_excludes) {
      for (const excl of direction_excludes.split(';').filter(r => r !== '')) {
        if (dep.display_informations.direction.toLowerCase().indexOf(excl.toLowerCase()) != -1) {
          right_direction = false;
          break;
        }
      }
    }

    // add departure
    if (right_direction && (ndisp < count))
    {
      delay = (dep.stop_date_time.departure_date_time != dep.stop_date_time.base_departure_date_time); // could use ad.get("delay") too
      cr = delay ? "real_delay" : "real_normal";
      cs = delay ? "scheduled_delay" : "scheduled_normal";

      let ad = additionalData.get(dep.display_informations.headsign);
      if (ad == null) ad = new Map([["track", ""]]);
      const result = [[getTimeAPI(dep.stop_date_time.departure_date_time), cr],
                      [getTimeAPI(dep.stop_date_time.base_departure_date_time), cs],
                      [ad.get("track"), ""],
                      [dep.display_informations.direction.replace(/ \(.*/g, ""), ""]]
      results.push(result);
      ndisp++;
    }

    // get full station name
    station = dep.stop_point.name;
  });

  // prepare download link
  const mergedData = {
    "api.sncf.com": data,
    "garesetconnexions.sncf": additionalData.get("data")
  };
  const jsonString = JSON.stringify(mergedData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // format results
  format(station, url, results);
}


// Display departures with GEC API for comparison purpose
function displayDeparturesGEC(data, direction_excludes, format) {
  const results = [];
  let station = "";
//  $.each(data, function(key, dep) {
  for (const [key, dep] of data) {
    if (key == "data") continue;

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
      //delay = (dep.get("status") != "Ontime" && dep.get("status") != "NORMAL");
      cr = delay ? "real_delay" : "real_normal";
      cs = delay ? "scheduled_delay" : "scheduled_normal";

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


// get map of train number with track and departure time
function extractGECInfos(data) {
  const results = new Map();
  $.each(data, function(i, dep) {
    result = new Map([["btime", dep.scheduledTime],
               ["atime", dep.actualTime],
               ["track", dep.platform.track],
               ["dest",  dep.traffic.destination],
               ["station", dep.uic],
               ["status", dep.informationStatus.trainStatus],
               ["delay", dep.informationStatus.delay]]);
    results.set(dep.trainNumber, result);
  });
  results.set("data", data);
  return results;
}

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
      let td = tr.insertCell();
      if (entry[1] != "") td.setAttribute('class', entry[1]);
      td.appendChild(document.createTextNode(entry[0]));
    });
  });
}

const now = new Date(Date.now());

const query = window.location.search;
const params = new URLSearchParams(query);
const line = params.get('line');
const count_display = params.has('count') ? params.get('count') : 3;
const count_request = count_display*3;
const format = params.get('format') == 'list' ? format_list : format_table;
const advanced = params.get('advanced') == 1 ? true : false;
const invert = params.get('invert') == 1 ? true : false;

async function displayStations(slot) {
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
    const resultsAPI = await Promise.all(promisesAPI);
    const resultsGEC = await Promise.all(promisesGEC);
    const dataGEC = resultsGEC.map(data => extractGECInfos(data));
    resultsAPI.forEach((data, index) => displayDepartures(data, stations[index][1], count_display, format, dataGEC[index], advanced));
    if (advanced)
      dataGEC.forEach((data, index) => displayDeparturesGEC(data, stations[index][1], format));
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

if (now.getHours() < 12 != invert) { // morning
  displayStations('sm');
} else {
  displayStations('se');
}

function formatTE(el) {
  return el < 10 ? "0" + el : el;
}
function formatTime(time) {
  return formatTE(now.getHours()) + ":" + formatTE(now.getMinutes()) + ":" + formatTE(now.getSeconds());
}
function formatDateFile(date) {
  return date.getFullYear() + "-" + formatTE(date.getMonth()+1) + "-" + formatTE(date.getDate()) + "_" +
         formatTE(date.getHours()) + "-" + formatTE(date.getMinutes()) + "-" + formatTE(date.getSeconds());
}

document.body.prepend(document.createTextNode("Prochains trains à " + formatTime(now)));

