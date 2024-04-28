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

function displayStation(station, directions)
{
  const station_id = getElement(station, 1)[0];

	$(document.body).append('<h3>' + station + ':</h3>');
//  var ul = document.createElement('ul');
//  ul.setAttribute('id','lines');
  //document.getElementById('lists').appendChild(ul);
  var $ul = $('<ul>');
  //$ul.setAttribute('id','lines');
  $(document.body).append($ul);

  // Url to retrieve departures
  var departuresUrl = 'https://api.navitia.io/v1/coverage/sncf/stop_areas/stop_area:SNCF:' + station_id + '/lines/line:SNCF:FR:Line::DDEF5935-0332-4ED5-B499-5C664AF7CF05:/departures?count=' + count_request;

  // Call Navitia API
  $.ajax({
    type: 'GET',
    url: departuresUrl,
    dataType: 'json',
    headers: {
      Authorization: 'Basic ' + btoa('cbfb30d4-a3b4-472e-9657-6ee4319e0501')
    },
    success: displayDepartures,
    error: function(xhr, textStatus, errorThrown) {
      alert('Error: ' + textStatus + ' ' + errorThrown);
    }
  });

  // Displays departures
  function displayDepartures(navitiaResult) {
    //var $ul = $('ul#lines');

    let ndisp = 0;
    $.each(navitiaResult.departures, function(i, dep) {
      var $li = $('<li>');

      // dep.stop_point.name

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
        t = dep.stop_date_time.departure_date_time.replace(/^[0-9]{4}[0-9]{1,2}[0-9]{1,2}T([0-9]{2})([0-9]{2})[0-9]{2}$/, "$1:$2");
        $li.html(t + ' ' + getElement(dep.display_informations.direction, 2)[1]);

        $ul.append($li);

        ndisp++;
      }
    });
  }
}

displayStation("Matabiau", ["Jourdain", "Auch"]);
displayStation("Arenes", ["Colomiers"]);
displayStation("Colomiers", ["Arenes"]);
displayStation("Lycee", ["Matabiau"]);
