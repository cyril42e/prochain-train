
function getTime(datetime)
{
  return datetime.replace(/^[0-9]{4}[0-9]{1,2}[0-9]{1,2}T([0-9]{2})([0-9]{2})[0-9]{2}$/, "$1:$2");
}

function getTime2(datetime)
{
  return datetime.replace(/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}T([0-9]{2}):([0-9]{2}):[0-9]{2}.*$/, "$1:$2");
}


// another API, unofficial, that provides additional information
async function fetchDepartures2(station_id)
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

async function fetchDepartures(line_id, station_id, count)
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

// Displays departures
function displayDepartures(navitiaResult, direction_excludes, count, format, additionalData, advanced) {
  let ndisp = 0;
  let station = "";
  const results = [];
  $.each(navitiaResult.departures, function(i, dep) {

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
      delay = (dep.stop_date_time.departure_date_time != dep.stop_date_time.base_departure_date_time);
      cr = delay ? "real_delay" : "real_normal";
      cs = delay ? "scheduled_delay" : "scheduled_normal";

      let ad = additionalData.get(dep.display_informations.headsign);
      if (ad == null) ad = ["", "", "", ""];

      let result = [[getTime(dep.stop_date_time.departure_date_time), cr],
                    [getTime(dep.stop_date_time.base_departure_date_time), cs],
                    [ad[0], ""], // track/platform
                    [dep.display_informations.direction.replace(/ \(.*/g, ""), ""]]
      if (advanced) {
        result = result.concat([[getTime2(ad[1]), ""],
                       [ad[2], ""],
                       [ad[3], ""]]);
      }
      results.push(result);
      ndisp++;
    }

    // get full station name
    station = dep.stop_point.name;
  });

  format(station, results);
}

// get map of train number with track and departure time
function extractAdditionalInfos(navitiaResult) {
  const results = new Map();
  $.each(navitiaResult, function(i, dep) {
    results.set(dep.trainNumber, [dep.platform.track, dep.actualTime, dep.informationStatus.trainStatus, dep.informationStatus.delay]);
  });
  return results;
}

function format_list(station, results)
{
  $(document.body).append('<h3>' + station + ':</h3>');
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

function format_table(station, results)
{
  let table = document.getElementById('tabletime');

  let tr = table.insertRow(-1);
  let th = document.createElement('th');
  th.setAttribute('colSpan', '4');
  th.innerHTML = station;
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

let query = window.location.search;
const params = new URLSearchParams(query);
const line = params.get('line');
const count_display = params.has('count') ? params.get('count') : 3;
const count_request = count_display*3;
const format = params.get('format') == 'list' ? format_list : format_table;
const advanced = params.get('advanced') == 1 ? true : false;

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
    const promises1 = stations.map(station => fetchDepartures(line, station[0], count_request));
    const promises2 = stations.map(station => fetchDepartures2(station[0]));
    const results1 = await Promise.all(promises1);
    const results2 = await Promise.all(promises2);
    const additionalData = results2.map(data => extractAdditionalInfos(data));
    results1.forEach((data, index) => displayDepartures(data, stations[index][1], count_display, format, additionalData[index], advanced));
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

if (now.getHours() < 12) { // morning
  displayStations('sm');
} else {
  displayStations('se');
}

function formatTE(el) {
  return el < 10 ? "0" + el : el;
}

document.body.prepend(document.createTextNode("Prochains trains à " + formatTE(now.getHours()) + ":" + formatTE(now.getMinutes()) + ":" + formatTE(now.getSeconds())));


