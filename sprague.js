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

