# Indian-City-Achievers-Explorer
This project is a simple web application that lets you explore notable people from any city in India.
It uses Wikidata to fetch information about personalities, their professions, and birth/death years.

Features:-
Search by City – Type the name of any Indian city and get a list of notable people.
Live Suggestions – Auto-suggests city names as you type.
Sorting Options – Sort results by name, birth year, or death year.
Profession Filter – Narrow results to people from a specific profession.
Pagination – Load more results without refreshing.
Duplicate Removal – Ensures no person appears more than once.
Shareable Link – Copy a link to share your search results.

How It Works:-
City Search – User enters a city name.
Wikidata Query – The app finds the city’s QID (unique Wikidata identifier) and confirms it’s in India.
Fetch People – It queries Wikidata for notable people born, lived, or died in that city.
Display & Filter – Results are shown in cards, with filtering and sorting options.

Technologies Used:-
HTML5 – Structure
CSS3 – Styling and layout
JavaScript (Vanilla) – Functionality and data fetching
Wikidata SPARQL API – Data source

