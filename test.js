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
	var as1 = ParseFile("./econightlight/AmbystomaSensitivity.csv")
	var as2 = ParseFile("./econightlight/ThomomysbottaeSensitivity.csv")

	var act = [as1, as2];

	// and these lights vs. the moon:
	var spd = ParseFile("./econightlight/SPD.csv")
	var lunar = ParseFile("./econightlight/lunarpower.csv")

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
