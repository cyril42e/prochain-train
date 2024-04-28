function displayStation(station_name, station_id)
{
	$(document.body).append('<h3>' + station_name + ':</h3>');
//  var ul = document.createElement('ul');
//  ul.setAttribute('id','lines');
  //document.getElementById('lists').appendChild(ul);
  var $ul = $('<ul>');
  //$ul.setAttribute('id','lines');
  $(document.body).append($ul);

  // Url to retrieve departures
  var departuresUrl = 'https://api.navitia.io/v1/coverage/sncf/stop_areas/stop_area:SNCF:' + station_id + '/lines/line:SNCF:FR:Line::DDEF5935-0332-4ED5-B499-5C664AF7CF05:/departures?count=4';

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

    $.each(navitiaResult.departures, function(i, dep) {
      var $li = $('<li>');

			// dep.stop_point.name
      $li.html(dep.stop_date_time.departure_date_time + ': ' + dep.display_informations.direction);

      $ul.append($li);
    });
  }
}

displayStation("Matabiau", "87611004");
displayStation("Arènes", "87446179");
displayStation("Colomiers", "87611467");
displayStation("Lycée International", "87611921");
