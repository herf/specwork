
function ParseFile(fn) {
	var txt = fs.readFileSync(fn).toString('utf8');
	return ParseCSV(txt, fn);
}

// generic CSV has "Wavelength" and then column 2 with label and power
function ParseCSV(content, fn) {
	var csplit = content.split("\n");
	if (csplit.length < 20) return -1;

	var header = csplit[0].split(',');

	var h0 = header[0].trim()

	if (h0 != 'Wavelength') {
		console.log("Didn't find Wavelength, instead: [" + escape(header[0]) + "]")
		return -1;
	}

	var col = []

	for (var i = 0; i < header.length; i++) {
		col[i] = {}
		col[i].name = header[i].trim();
		col[i].data = [];
	}

	// TODO handle more columns
	var name = header[1];

	var specdata = [];

	for (var i = 1; i < csplit.length; i++) {
		var kv = csplit[i].split(',');

		for (var c = 0; c < kv.length; c++) {
			var power = parseFloat(kv[c]);
			if (isNaN(power)) power = 0;	// $$$
			col[c].data.push(power);
		}
	}

	var r = {};
	r.fn = fn;
	r.col = col;
	
	// some fns prefer knowing these:
	r.base = col[0].data[0];
	r.dt   = col[0].data[1] - col[0].data[0];

	r.freq = col[0].data;
	r.data = col[1].data;	// $$$ not really

	console.log("Read " + r.freq.length + " rows starting with " + r.base + " nm from:" + fn);
	return r;
}
