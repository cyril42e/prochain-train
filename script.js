
function getTime(datetime)
{
  return datetime.replace(/^[0-9]{4}[0-9]{1,2}[0-9]{1,2}T([0-9]{2})([0-9]{2})[0-9]{2}$/, "$1:$2");
}


function displayStation(line_id, station_id, direction_excludes, format)
{
  const token = "cbfb30d4-a3b4-472e-9657-6ee4319e0501";
  const full_line_id = 'line:SNCF:FR:Line::' + line_id + ':';
  const full_station_id = 'stop_area:SNCF:' + station_id;

  // Url to retrieve departures
  var departuresUrl = 'https://api.sncf.com/v1/coverage/sncf/stop_areas/' + full_station_id + '/lines/' + full_line_id + '/departures?count=' + count_request;

  // Call Navitia API
  $.ajax({
    type: 'GET',
    url: departuresUrl,
    dataType: 'json',
    headers: {
      Authorization: 'Basic ' + btoa(token)
    },
    success: displayDepartures,
    error: function(xhr, textStatus, errorThrown) {
      alert('Error: ' + textStatus + ' ' + errorThrown);
    }
  });

  let station = "";

  // Displays departures
  function displayDepartures(navitiaResult) {
    let ndisp = 0;
    results = [];
    $.each(navitiaResult.departures, function(i, dep) {

      // filter directions
      let right_direction = true;
      for (const excl of direction_excludes) {
        if (dep.display_informations.direction.toLowerCase().indexOf(excl.toLowerCase()) != -1) {
          right_direction = false;
          break;
        }
      }

      // add departure
      if (right_direction && (ndisp < count_display))
      {
	delay = (dep.stop_date_time.departure_date_time != dep.stop_date_time.base_departure_date_time);
        cr = delay ? "real_delay" : "real_normal";
        cs = delay ? "scheduled_delay" : "scheduled_normal";
        results.push([[getTime(dep.stop_date_time.departure_date_time), cr],
                      [getTime(dep.stop_date_time.base_departure_date_time), cs],
                      ["", ""], // track/platform
                      [dep.display_informations.direction.replace(/ \(.*/g, ""), ""]]);
        ndisp++;
      }

      // get full station name
      station = dep.stop_point.name;
    });

    format(station, results);
  }
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

  let tr = table.insertRow();
  let th = document.createElement('th');
  th.setAttribute('colSpan', '4');
  th.innerHTML = station;
  tr.appendChild(th);

  $.each(results, function(i, dep) {
    let tr = table.insertRow();

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

function displayStations(slot) {
  let i = 1;
  while (params.has(slot + i)) {
    const station = params.get(slot + i);
    const direction_excludes = params.get(slot + i + 'x').split(';');
    displayStation(line, station, direction_excludes, format);
    i++;
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


