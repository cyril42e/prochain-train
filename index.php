<!DOCTYPE html>
<html>
<head>
  <title>Prochain Train</title>
  <link rel="stylesheet" href="style-index.css">
</head>

<body>

<h1>Prochain Train</h1>
<h2>Présentation</h2>

<p>Prochain Train utilise l'<a href="https://numerique.sncf.com/startup/api/">API SNCF</a>
pour afficher de façon compacte les prochains
départs d'une sélection personnalisée de gares, différenciées entre le matin et le soir.</p>

On peut l'utiliser de différentes manières:
<ul>
  <li>Avec un favori dans son navigateur</li>
  <li>Comme une WebApp sur son smartphone en cliquant sur "Ajouter à l'écran d'accueil" dans le menu de son navigateur</li>
  <li>Comme un widget sur son smartphone avec <a href="https://play.google.com/store/apps/details?id=com.binarysmith.webclipwidget.ad">Widgetify</a></li>
</ul>

<h2>Exemple</h2>

<p>J'utilise personnellement quotidiennement
<a href="get.php?line=DDEF5935-0332-4ED5-B499-5C664AF7CF05&sm1=87611921&sm1x=jourdain;auch&sm2=87611467&sm2x=jourdain;auch;matabiau&se1=87611004&se2=87446179&se2x=matabiau;jourdain;auch&count=3&format=table">cette URL</a>:
<pre>http://crteknologies.fr/tools/prochain-train/get.php?line=DDEF5935-0332-4ED5-B499-5C664AF7CF05&sm1=87611921&sm1x=jourdain;auch&sm2=87611467&sm2x=jourdain;auch;matabiau&se1=87611004&se2=87446179&se2x=matabiau;jourdain;auch&count=3&format=table</pre>
</p>

L'URL se decompose ainsi:
<ul>
  <li><pre>http://crteknologies.fr/tools/prochain-train/get.php<pre> : l'URL du service sur ce site.</li>
  <li><pre>line=DDEF5935-0332-4ED5-B499-5C664AF7CF05</pre> : l'identifiant de la ligne SNCF à suivre (ici Toulouse-Auch).</li>
  <li><pre>sm1=87611921</pre> : l'identifiant de la première station à suivre le <b>matin</b> (StationMorning1) (ici Colomiers Lycée International).</li>
  <li><pre>sm1x=jourdain;auch</pre> : une liste de chaines de caractères séparées par point virgule, servant à exclure les trains dont la
    destination contient une de ces chaines de caractères afin de ne garder que ceux qui vont dans le bon sens (ici je veux seulement le matin les
    trains qui vont vers Toulouse).
  <li><pre>sm2=87611467</pre> : l'identifiant d'une seconde gare à suivre le matin (ici Colomiers).</li>
  <li><pre>sm2x=jourdain;auch;matabiau</pre> : la liste d'exclusions pour cette seconde gare (ici j'ai décidé d'exclure aussi Matabiau afin de ne pas avoir
    en double avec la première gare les trains qui vont au même endroit, mais seulement les trains supplémentaires qui ne circulent que entre
    Colomiers et Arènes).</li>
  <li><pre>se1=87611004</pre> : l'identifiant de la première station à suivre le <b>soir</b> (StationEvening1) (ici Toulouse Matabiau).
    Pas besoin de liste d'exclusion dans ce cas.</li>
  <li><pre>se2=87446179</pre> : l'identifiant d'une seconde gare à suivre le soir (ici Saint-Cyprien Arènes).</li>
  <li><pre>se2x=matabiau;jourdain;auch</pre> : la liste d'exclusions pour cette seconde gare.</li>
  <li><pre>count=3</pre> : affichage de trois prochains départs pour chaque gare.</li>
  <li><pre>format=table</pre> : affichage des départs sous forme de tableau (autres choix: <pre>liste</pre>).</li>
</ul>

<h2>Configuration personnelle</h2>
<h3>Trouver les identifiants de lignes</h3>

<p>TODO</p>

<p><pre>https://api.sncf.com/v1/coverage/sncf/pt_objects?q=ter%20toulouse</pre></p>

<p>Ne garder que le code hexadécimal séparé par des tirets, le reste est ajouté.</p>

<h3>Trouver les identifiants de gare</h3>

<p>TODO</p>

<p><pre>https://api.sncf.com/v1/coverage/sncf/places?q=colomiers</pre></p>

<p>Ne garder que la valeur numérique, le reste est ajouté.</p>

<p><pre>https://www.garesetconnexions.sncf/fr/gares-services</pre> (chercher le champ <pre>data-uic=</pre> et enlever deux zéros).</p>

<h2>Limitations</h2>

Pour l'instant l'affichage des voies n'est pas implémenté, car l'information est absente de l'API. Je te travaille encore sur le sujet.

<h2>Explications techniques</h2>

<p>L'<a href="https://numerique.sncf.com/startup/api/">API</a> officielle de la SNCF est exploitée, notamment la requête <pre>departures</pre>:
<pre>https://api.sncf.com/v1/coverage/sncf/stop_areas/stop_area:SNCF:<station_id>/lines/line:SNCF:FR:Line::<line_id>:/departures?count=9</pre></p>

<p>Une clé d'accès personnelle est nécessaire pour accéder à l'API, obtenable gratuitement <a href="https://numerique.sncf.com/startup/api/token-developpeur/">
sur le site de l'API SNCF</a>. Si vous forkez le projet, s'il vous plait demandez votre propre clé et n'utilisez pas celle de ce site.</p>

<p>Le code source de cet outil sera disponible sur GitHub TODO</p>

</body>
</html>
