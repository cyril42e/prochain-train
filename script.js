// Url to retrieve departures
var departuresUrl = 'https://api.navitia.io/v1/coverage/sncf/stop_areas/stop_area:SNCF:87611921/lines/line:SNCF:FR:Line::DDEF5935-0332-4ED5-B499-5C664AF7CF05:/departures?count=4';

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
  var $ul = $('ul#lines');

  $.each(navitiaResult.departures, function(i, dep) {
    var $li = $('<li>');

    $li.html(dep.stop_date_time.departure_date_time + ': ' + dep.stop_point.name + ' (dir ' + dep.display_informations.direction + ') ')

    $ul.append($li);
  });
}

