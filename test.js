const CONFIG = 
{
	"db": "~/data/cached-tiles.db",
	"port": 9148,
	"layers": 
	{
		"osm": { "url": "https://tile.openstreetmap.org/{z}/{x}/{y}.png" 
	}	}
}
const TC = require("./tile-cache.js");
TC.start(CONFIG);