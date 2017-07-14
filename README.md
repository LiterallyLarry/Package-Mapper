# Package-Mapper
Displays the tracking information of your USPS packages within a terminal interface

Bored of tracking your shipments the mundane way? Tired of refreshing a plain old web page to get information? Then, grab an open terminal window, and get started with the Package Mapper!

![Example Image](http://larryhui.com/images/example-package-mapper.png)

This program creates a terminal inference that displays tracking information from the USPS Tracking API along with current location status using the Google Maps API.

With an auto updating display each hour, you can leave your terminal open and watch your package make the journey to your front door.

### Prerequisites:
Please provide your tracking numbers, USPS API key, and Google Maps API key within `config.json`.

You can sign up for a USPS API key at: https://www.usps.com/business/web-tools-apis/welcome.htm

You can sign up for a Google Maps API key at: https://developers.google.com/maps/documentation/javascript/get-api-key

### Setup:
After having set your API keys in `config.json`, run `npm install` to install dependencies and that's it!

You can start the program by running `npm start`.

---

This program was tested on Node v8.1.3 running on Debian 8.7 and may not be compatible with previous releases.