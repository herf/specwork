
run:	dep
	node all.js

res:	dep
	node all.js -resample ../econightlight/AmbystomaSensitivity.csv
	node all.js -resample ../econightlight/ThomomysbottaeSensitivity.csv
	node all.js -resample ../econightlight/lunarpower.csv

dep:
	cat sprague.js csv.js ../ecological/calc.js test.js > all.js