// copied from f.luxometer mainly

// resample at 1nm in the given range
function resample1nm(rdata) {
	var freq = rdata.freq;

	var f0 = freq[0];
	var f1 = freq[freq.length - 1]
	return resampleSprague(rdata.freq, rdata.data, f0, f1);
}

function concatAuto(ar, bar) {
	if (bar instanceof Float32Array) {
		for (var i = 0; i < bar.length; i++) {
			ar.push(bar[i]);
		}
		return ar;
	}
	return ar.concat(bar);
}

// from Westland et al, only for uniform cases (not ocean optics):
function resampleSprague(freq, counts, minvis, maxvis) {

	// build in two extra samples at edge
	var fr = [];
	var co = [];

	if (freq.length < 6) {
		console.log("Cannot process small spectra");
		return;
	}

	// record stepsize and limit in the original array:
	var dt = freq[1] - freq[0];
	var lim = freq.length - 1;

	var maxdata = freq[lim];

	// pad per CIE/westland -> fr, co 
	{
		const xd = 209;
		var x0 = [884, -1960, 3033, -2648, 1080, -180];
		var x1 = [508, -540, 488, -367, 144, -24];
		var xn = [-24, 144, -367, 488, -540, 508];
		var xn1 = [-180, 1080, -2648, 3033, -1960, 884];

		fr.push(freq[0] - dt * 2);	fr.push(freq[0] - dt);
		co.push(0);	co.push(0);

		for (var i = 0; i < 6; i++) {
			co[0] += x0[i] * counts[i];
			co[1] += x1[i] * counts[i];
		}
		co[0] /= xd;
		co[1] /= xd;

		fr = concatAuto(fr, freq);
		co = concatAuto(co, counts);
		//fr = fr.concat(freq);
		//co = co.concat(counts);

		fr.push(freq[lim] + dt);
		fr.push(freq[lim] + dt * 2);
		co.push(0);
		co.push(0);

		for (var i = 0; i < 6; i++) {
			var off = i - 5;
			co[lim + 3] += xn[i] * counts[lim + off];
			co[lim + 4] += xn1[i] * counts[lim + off];
		}
		co[lim + 3] /= xd;
		co[lim + 4] /= xd;
	}

	// write out minvis to maxvis:

	const ad = 24;

	// k[0] => a1 coeffs
	var k = [
		 [2, -16, 0, 16, -2, 0],
		 [-1, 16, -30, 16, -1, 0],
		 [-9, 39, -70, 66, -33, 7],
		 [13, -64, 126, -124, 61, -12],
		 [-5, 25, -50, 50, -25, 5]
	];

	var o = {};
	o.freq = [];
	o.counts = [];

	for (var f = minvis; f <= maxvis; f++) {

		o.freq.push(f);

		// for now fill with zero (could edge-extend)
		if (f < freq[0]) {
			o.counts.push(0);
			continue;
		}
		if (f > freq[freq.length - 1]) {
			o.counts.push(0);
			continue;
		}

		var amt = (f - freq[0]) / dt;

		// hack to cope with CIE's extrapolator, pull back by epsilon:
		if (f == maxdata) amt -= 0.001;

		var off = Math.floor(amt);
		if (off > lim) {
			o.counts.push(0);
			continue;
		}

		var a = [];

		// using "co" shifts us 2 to the left (because of padding)
		a[0] = co[off + 2];

		for (var i = 0; i < 5; i++) {

			var sum = 0;
			for (var c = 0; c < 6; c++) {
				if (off + c >= co.length) {
					console.log("$$$$$BOUNDS", c, f, off, fr[off]);
				}
				sum += k[i][c] * co[off + c];
			}
			a[i + 1] = sum / ad;
		}

		// now we have a polynomial defined from 0-1, so we have to find a fraction:
		var x = amt - off;
		var x2 = x * x;
		var x3 = x2 * x;
		var x4 = x2 * x2;
		var x5 = x3 * x2;

		var result = a[0] + x * a[1] + x2 * a[2] + x3 * a[3] + x4 * a[4] + x5 * a[5];

		//console.log(f, result);
		if (isFinite(result)) {
			o.counts.push(result);
		} else {
			o.counts.push(0);
			console.log("Failed", f, result);
		}
	}

	// pass it back a little faster:
	var output = {};
	output.counts = new Float32Array(o.counts);
	output.freq   = new Float32Array(o.freq);

	return output;
}


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
			if (isNaN(power)) power = 1;	// $$$
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
// Compact list of important calculations, so you don't have to look at all our UI code

function ImpactCRI(CRI) {
	if (CRI >= 75) return 0;
	return (75 - CRI) / 150;
}

function SortLamps(all) {

	var sorted = [];
	var index = {};

	for (var lamp in all) {
		
		// things we should average (as groups):
		var mean = {};
		mean.num = 0;
		mean.denom = 0;
		mean.name = lamp;
		mean.metric = all[lamp];

		// pull in data from this other table when we need it:
		if (visual[lamp]) {
			// compute our 0-1 "acceptability" CRI mapping:
			var lampCRI = parseFloat(visual[lamp].CRI);
			mean.metric.CRI = ImpactCRI(lampCRI);
		}

		// human circadian and star visibility, always included
		addMean(mean, "Melanopic lux");
		addMean(mean, "Starry Light");

		if (useCRI) {
			addMean(mean, "CRI");
		}

		// either include one species or four:
		var weight = 1.0;
		if (group == "all") weight = 1.0 / 4;

		// "mean of all four" per the paper:
		if (group == "shearwater" || group == "all") addMean(mean, "Shearwater", weight);
		if (group == "salmon" || group == "all") addMean(mean, "Juvenile Salmon", weight);

		// insect group = 1/4
		if (group == "insect" || group == "all") {
			addMean(mean, "Cleve Moth Attraction", weight / 3);
			addMean(mean, "van Grunsven Insect Phototaxis", weight / 3);
			addMean(mean, "Bee Attraction", weight / 3);
		}

		// turtle group = 1/4
		if (group == "turtle" || group == "all") {
			addMean(mean, "Green Turtle 92", weight / 3);
			addMean(mean, "Chelonia", weight / 3);
			addMean(mean, "Loggerhead Hatchling Attraction", weight / 3);
		}

		sorted.push({"label": lamp, "value": mean.num / mean.denom});
		index[lamp] = mean.num / mean.denom;
	}

	// possibly: normalize to D65 once more (accounts for CRI being good for D65)
	/*
	var D65val = index["D65"];
	for (var a in sorted) {
		sorted[a].value /= D65val;
	}*/

	sorted.sort(function(a, b) {
		return a.value - b.value;
	});

	return sorted;
}

function addMean(mean, id, weight) {
	if (!weight) weight = 1.0;

	if (!mean.metric.hasOwnProperty(id)) {
		console.log("Missing", id, mean.name);
		return;
	}

	if (mean.metric[id].d65) {
		mean.num += weight * mean.metric[id].d65;
	} else {
		mean.num += weight * mean.metric[id];
	}
	mean.denom += weight;
}

// Methods for integrating/interpolation action spectra (i.e. SPD * Action)

// lerp low-resolution action spectra to whatever wavelength you need here:
function lerpAction(act, wl) {
	var pos = (wl - act.base) / act.dt;
	var ind = Math.floor(pos);
	var frc = pos - ind;

	if (ind < 0) return 0;
	if (ind >= act.data.length) return 0;

	var result = act.data[ind];
	if (ind + 1 < act.data.length) {
		result += (act.data[ind + 1] - act.data[ind]) * frc;
	}

	return result;
}

// using previously-loaded data, calculate s * a (where they overlap)
function doIntegral(spec, act) {

	var r = {};

	if (!spec || !act) {
		console.log("Could not find data", spec, act);
		return 0;
	}

	var specdata = spec.data;
	var specwl = spec.freq;

	// loop over SPD wavelengths:
	var w0 = specwl[0];
	var w1 = specwl[specwl.length - 1] + 1;

	// you could adapt the input to another resolution, as long as you make D65 XX nm as well:
	var dt = specwl[1] - specwl[0];

	var sum = 0;
	var total = 0;

	r.data = [];

	// not very well bounds-checked here:
	for (var i = 0; i < specwl.length; i ++) {
		var wl = specwl[i];
		if (isNaN(specdata[i])) {
			console.log(wl, "invalid");
			continue;
		}

		var a = lerpAction(act, wl);
		sum += specdata[i] * a * dt;

		r.data.push(specdata[i] * a);

		total += specdata[i];
	}

	r.sum = sum;
	r.total = total;

	return r;
}


var fs = require('fs')
var process = require('process')

// our job for travis 10/2022 is to just compute:

// per-species S:
//   per-light L:
//     response S:L / S:lunar

var lum = ParseFile("lum.csv")

function getLux(spd) {
	var luxi = doIntegral(spd, lum);

	return luxi.sum;	
}

function TravisRun() {

	// consider these species
	var as1 = ParseFile("../econightlight/AmbystomaSensitivity.csv")
	var as2 = ParseFile("../econightlight/ThomomysbottaeSensitivity.csv")

	var act = [as1, as2];

	// and these lights vs. the moon:
	var spd = ParseFile("../econightlight/SPD.csv")
	var lunar = ParseFile("../econightlight/lunarpower.csv")

	//console.log(spd);

	// console.log(as1.data.length);
	// console.log(as2.data.length);
	// console.log(lunar.data.length);

	// console.log(resample1nm(as1))
	// console.log(resample1nm(as2))
	// console.log(resample1nm(lunar))

	// how many lux is "lunar"

	var luxscale = 1.0 / getLux(lunar);

	//console.log(luxi.sum + "lx calibration")

	for (var i = 0; i < act.length; i++) {
		console.log(act[i].fn);
		var ai = doIntegral(lunar, act[i]);
		for (var s = 1; s < spd.col.length; s++) {
			var ss = spd.col[s];

			var stmp = {
				base: spd.base,
				dt:   spd.dt,
			}
			stmp.freq = spd.freq;
			stmp.data = ss.data;

			var lx = getLux(stmp)
			var luxscale2 = 1.0 / lx;

			var tscale = luxscale2 / luxscale;

			var si = doIntegral(stmp, act[i])

			// travis wants ref to be 0.1lx of moonlight, so we do 10x:
			var rellun = 10.0 * tscale * si.sum / ai.sum;

			console.log(act[i].col[1].name, ss.name, rellun, lx.toFixed(1) + "lx src");
			//var res = resample1nm(act[i]);
		}
	}
}

function resampleOne(fn) {
	var xx = ParseFile(fn)
	var x1 = resample1nm(xx)

	var fn2 = fn.split('.csv')[0] + "-1nm.csv"

	console.log(fn2);
	
	var csvlines = []
	csvlines[0] = "Wavelength,Sensitivity"
	for (var i = 0; i < x1.freq.length; i++) {
		csvlines.push(x1.freq[i] + "," + x1.counts[i])
	}

	fs.writeFileSync(fn2, csvlines.join("\n"))
}

if (process.argv.length > 2) {
	if (process.argv[2] == '-resample') {
		return resampleOne(process.argv[3])
	}
}

// else
TravisRun();
