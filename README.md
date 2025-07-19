## Specwork
#### Michael Herf, 2022

This repo has some small "spectral" tools including [CIE-recommended Sprague upsampling](https://github.com/herf/specwork/blob/master/sprague.js) for work with spectral irradiance data. This is one of the resamplers used in our f.luxometer project. It is based on the code from Westland but fixes a couple epsilon bugs (so that edge cases are handled properly).

It was mostly developed to process spectra from Travis Longcore's dataset here: https://github.com/tlongcore/econightlight, which you should probably fetch in parallel to this repo.

If you have the econightlight data, you can convert provided spectra to 1nm using the Sprague resampler:
> make res

You can run some test routines simply with any modern Node.js and a simple Makefile, as:
> make
