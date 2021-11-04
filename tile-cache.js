const H = require("http-server");
const SQLITE = require("sqlite");
const REQ = require("request");

var config;

function normalize_config(c)
{
	function set_def(obj, key, value)
	{
		if (typeof obj[key] == "undefined") 
			obj[key] = value;
	}

	for(var key in c)
	{
		set_def(c[key], "mime", "image/png");
		set_def(c[key], "type", "xyz");
	}
	return c;
}

function xyz_to_quad(x, y, z)
{
	var quad = '';
	for (var i = z; i > 0; i--)
	{
		var b = 0;
		var mask = 1 << (i - 1);
		if ((x & mask) !== 0) b++;
		if ((y & mask) !== 0) b += 2;
		quad += b.toString();
	}
	return quad;
}

function ontile(q, res, token, request)
{
	var url = request.getUrl();
	var parts = url.split("/");
	if (parts.length != 5)
	{
		H.end(res, 400, "");
		return;
	}
	var [_, source, x, y, z] = parts;
	x = Number(x);
	y = Number(y);
	z = Number(z);

	var c = config.layers[source];
	if (typeof c == "undefined")
	{
		H.end(res, 404, "");
		return;
	}

	res.onAborted(() =>
	{
		res.is_aborted = true;
	});

	var sql = "SELECT data FROM tile WHERE source = ? AND x = ? AND y = ? AND z = ?";
	var rows = db.read(sql,[source, x,y,z])
	if (rows.length > 0)
	{
		H.end(res, 200, rows[0]["data"], c.mime);
		return;
	}
	var url = c.url.replace("{x}", x).replace("{y}", y).replace("{z}", z);
	REQ(url, {"encoding":null}, function(err, response, body)
	{
		if (response.statusCode != 200)
		{
			if (!res.is_aborted)
				H.end(res, 404, "");
			
			return;
		}

		sql = "INSERT INTO tile VALUES (?,?,?,?,?)";
		body = new Uint8Array(body);
		db.write(sql,[source,x,y,z,body])

		if (!res.is_aborted)
			H.end(res, 200, new Uint8Array(body), c.mime);
	})
}

function start(config_obj)
{
	config = config_obj;
	config.layers = normalize_config(config_obj.layers);
	var SCHEMA =
	{
		"tile":
		{
			"columns": [ "source", "x", "y", "z", "data" ],
			"index": [ ["source", "x", "y", "z"] ]
		}
	}
	db = new SQLITE(config.db, SCHEMA)
	H.get("/*", ontile);
	H.start(config.port);
}

exports.start = start;
