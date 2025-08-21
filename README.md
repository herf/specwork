## Specwork
#### Michael Herf, 2022-2025

#### Update: comparing electric lighting spectra to moonlight
We are adding the ability to use this code to reproduce the results of a recent paper  (with Travis Longcore) that considers moonlight as a reference nighttime illuminant to simulate impacts of electric lighting on wildlife. So the [econightlight](https://github.com/herf/specwork/tree/master/econightlight) folder is now included as a demo dataset here, and the Makefile will let you run some tests on it.

To use the econightlight data, you should have a modern Node.js, and you can convert provided spectra to 1nm using the Sprague resampler:
> make res

You can run some test routines simply with any modern Node.js and a simple Makefile, as:
> make

This "moonlight" approach follows our [JEZ-A paper](https://onlinelibrary.wiley.com/doi/abs/10.1002/jez.2184) which used D65 (daylight) as a reference illuminant, and the "calc.js" file is included from the [ecological](https://github.com/herf/ecological) repo.

#### Spectral tools and good resamplers

This repo was originally created to provide general-purpose "spectral" tools including [CIE-recommended Sprague upsampling](https://github.com/herf/specwork/blob/master/sprague.js) for work with spectral irradiance data, since often spectral data is at many resolutions and it needs to be resampled to be used with action spectra and for other purposes. Here we provide code to do "good" 1nm upsampling, based on one of the resamplers used in our f.luxometer project. It is based on the code from Westland but fixes a couple epsilon bugs (so that edge cases are handled properly).
