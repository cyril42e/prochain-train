const stations = [
  ["87611004", "Matabiau", "Toulouse Matabiau (Toulouse)"],
  ["87446179", "Arenes", "Saint-Cyprien - Arènes (Toulouse)"],
  ["87611467", "Colomiers", "Colomiers (Colomiers)"],
  ["87611921", "Lycee", "Colomiers - Lycée International (Colomiers)"],
  ["87611806", "Jourdain", "L'Isle-Jourdain (L'Isle-Jourdain)"],
  ["87611749", "Auch", "Auch (Auch)"]
];

const count_request = 8;
const count_display = 3;

function getElement(station, index)
{
  return stations.filter(tuple => tuple[index] === station)[0];
}

function getTime(datetime)
{
  return datetime.replace(/^[0-9]{4}[0-9]{1,2}[0-9]{1,2}T([0-9]{2})([0-9]{2})[0-9]{2}$/, "$1:$2");
}


function displayStation(station, directions, format)
{
  const station_id = getElement(station, 1)[0];
  const line_id = "line:SNCF:FR:Line::DDEF5935-0332-4ED5-B499-5C664AF7CF05:";
  const token = "cbfb30d4-a3b4-472e-9657-6ee4319e0501";

  // Url to retrieve departures
  var departuresUrl = 'https://api.sncf.com/v1/coverage/sncf/stop_areas/stop_area:SNCF:' + station_id + '/lines/' + line_id + '/departures?count=' + count_request;

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

  // Displays departures
  function displayDepartures(navitiaResult) {
    let ndisp = 0;
    results = [];
    $.each(navitiaResult.departures, function(i, dep) {

      // filter directions
      let right_direction = false;
      for (const dir of directions) {
        if (dep.display_informations.direction == getElement(dir, 1)[2]) {
          right_direction = true;
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
                      [getElement(dep.display_informations.direction, 2)[1], ""]]);
        ndisp++;
      }
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

let format = format_list;
format = format_table;

if (now.getHours() < 12) {
  displayStation("Lycee", ["Matabiau"], format);
  displayStation("Colomiers", ["Arenes"], format);
} else {
  displayStation("Matabiau", ["Jourdain", "Auch"], format);
  displayStation("Arenes", ["Colomiers"], format);
}

function formatTE(el) {
  return el < 10 ? "0" + el : el;
}

document.title += " @" + formatTE(now.getHours()) + ":" + formatTE(now.getMinutes()) + ":" + formatTE(now.getSeconds());
