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
pour afficher de façon rapide et compacte les prochains
départs d'une sélection personnalisée de gares, différenciées entre le matin et le soir.
Il utilise aussi l'API de MétéoFrance pour afficher les prévisions de pluie dans l'heure.</p>

On peut l'utiliser de différentes manières:
<ul>
  <li>Avec un favori dans son navigateur</li>
  <li>Comme une WebApp sur son smartphone en cliquant sur "Ajouter à l'écran d'accueil" dans le menu de son navigateur</li>
  <li>Comme un widget sur son smartphone avec <a href="https://play.google.com/store/apps/details?id=com.binarysmith.webclipwidget.ad">Widgetify</a></li>
</ul>

<h2>Exemple</h2>

<p>J'utilise personnellement quotidiennement
<a href="get.php?line=DDEF5935-0332-4ED5-B499-5C664AF7CF05&sm1=87611921&sm1x=jourdain;auch&sm2=87611467&sm2x=jourdain;auch&rcm=43.616294,1.314077&se1=87611004&se2=87446179&se2x=matabiau&rce=43.611301,1.453561&count=4&format=table">cette URL</a>:
<pre>https://crteknologies.fr/tools/prochain-train/get.php?line=DDEF5935-0332-4ED5-B499-5C664AF7CF05&sm1=87611921&sm1x=jourdain;auch&sm2=87611467&sm2x=jourdain;auch&rcm=43.616294,1.314077&se1=87611004&se2=87446179&se2x=matabiau&rce=43.611301,1.453561&count=4&format=table</pre>
</p>

L'URL se decompose ainsi:
<ul>
  <li><pre>https://crteknologies.fr/tools/prochain-train/get.php</pre> : l'URL du service sur ce site.</li>
  <li><pre>line=DDEF5935-0332-4ED5-B499-5C664AF7CF05</pre> : l'identifiant de la ligne SNCF à suivre (ici Toulouse-Auch).</li>
  <li><pre>sm1=87611921</pre> : l'identifiant de la première station à suivre le <b>matin</b> (StationMorning1) (ici Colomiers Lycée International).</li>
  <li><pre>sm1x=jourdain;auch</pre> : une liste de chaines de caractères séparées par point virgule, servant à exclure les trains dont la
    destination contient une de ces chaines de caractères afin de ne garder que ceux qui vont dans le bon sens (ici je veux seulement le matin les
    trains qui vont vers Toulouse).
  <li><pre>sm2=87611467</pre> : l'identifiant d'une seconde gare à suivre le matin (ici Colomiers).</li>
  <li><pre>sm2x=jourdain;auch</pre> : la liste d'exclusions pour cette seconde gare (je pourrais également exclure Matabiau afin de ne pas avoir
    en double avec la première gare les trains qui vont au même endroit, mais seulement les trains supplémentaires qui ne circulent que entre
    Colomiers et Arènes, mais cela est risqué car quand les trains changent de départ ils n'apparaitraient nulle part).</li>
  <li><pre>rcm=43.616294,1.314077</pre> : les coordonnées par défaut pour les prévisions de pluie le matin (Rain Coordinates Morning).</li>
  <li><pre>se1=87611004</pre> : l'identifiant de la première station à suivre le <b>soir</b> (StationEvening1) (ici Toulouse Matabiau).
    Pas besoin de liste d'exclusion dans ce cas car c'est le départ de la ligne.</li>
  <li><pre>se2=87446179</pre> : l'identifiant d'une seconde gare à suivre le soir (ici Saint-Cyprien Arènes).</li>
  <li><pre>se2x=matabiau;jourdain;auch</pre> : la liste d'exclusions pour cette seconde gare (même remarque que précédemment
    sur la possibilité d'ajouter "jourdain;auch" pour ne pas avoir les mêmes trains que l'autre gare).</li>
  <li><pre>rce=43.611301,1.453561</pre> : les coordonnées par défaut pour les prévisions de pluie le soir (Rain Coordinates Evening).</li>
  <li><pre>count=4</pre> : affichage des quatre prochains départs pour chaque gare.</li>
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

<p><pre>https://www.garesetconnexions.sncf/fr/gares-services</pre> (chercher le champ <pre>data-uic=</pre> et enlever les deux zéros devant).</p>

<h3>Trouver les coordonnées pour les prévisions de pluie</h3>

<p>Les coordonnées doivent être fournies dans l'URL pour ne pas avoir à attendre le téléchargement des horaires de l'API SNCF
pour pouvoir récupérer les coordonnées de la gare avant de lancer la requête sur MétéoFrance (elles se font en parallèle).
Cela permet également de choisir d'autres coordonnées, par exemple plus proches du domicile ou du lieu de travail.
Elles peuvent par exemple être obtenues dans votre site de cartographie préféré.</p>

<p>Les coordonnées fournies ne sont cependant que des valeurs de secours, car la page va demander votre position courante
si elle est disponible. Depuis un ordinateur, cette position sera peu précise car obtenue par l'IP de votre connexion internet,
mais sera aussi trop lente et il se rabattra sur les valeurs de secours. Sur un smartphone, il faut avoir activé le positionnement,
et autoriser la page à y accéder. Seul le code exécuté sur votre appareil a accès à ces coordonnées, pas le serveur, il n'y
a donc aucun problème de confidentialité (mais l'API de MétéoFrance y a accès).</p>

<p>La dernière ligne précise quelles coordonnées ont été utilisées, "def" pour le valeurs de secours par défaut, et "cur"
pour les valeurs courantes. Un lien permet également de visualiser ces coordonnées.</p>

<h2>Explications techniques</h2>

<p>L'<a href="https://numerique.sncf.com/startup/api/">API</a> officielle de la SNCF est exploitée, notamment la requête "departures" :
<pre>https://api.sncf.com/v1/coverage/sncf/stop_areas/stop_area:SNCF:&lt;station_id&gt;/lines/line:SNCF:FR:Line::&lt;line_id&gt;:/departures?count=9</pre></p>

<p>Une clé d'accès personnelle est nécessaire pour accéder à l'API, obtenable gratuitement <a href="https://numerique.sncf.com/startup/api/token-developpeur/">
sur le site de l'API SNCF</a>. Si vous forkez le projet, s'il vous plait demandez votre propre clé et n'utilisez pas celle de ce site.</p>

<p>Le code source de cet outil est <a href="https://github.com/cyril42e/prochain-train">disponible sur GitHub</a></p>

<h2>Limitations</h2>

Pour l'instant l'affichage des voies et des trains supprimés se fait avec un contournement car l'information est absente de l'API.

</body>
</html>
