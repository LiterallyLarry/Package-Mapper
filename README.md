# Package-Mapper
Displays the tracking information of your USPS packages within a terminal interface.

![Example Image](http://larryhui.com/images/example-package-mapper.png)

Bored of tracking your shipments the mundane way? Tired of refreshing a plain old web page to get information? Then, grab an open terminal window, and get started with the Package Mapper!

This program creates a terminal inference that displays tracking information from the USPS Tracking API along with current location status using the Google Maps API.

With an auto updating display each hour, you can leave your terminal open and watch your package make the journey to your front door.

### Prerequisites:
Please provide your tracking numbers, USPS API key, and Google Maps API key within `config.json` like so:

```
{
    "usps_api_key" : "API_KEY_HERE",
    "google_maps_api_key" : "API_KEY_HERE",
    "tracking_numbers" : ["PACKAGE_1", "PACKAGE_2", "PACKAGE_3"]
}
```

### API Registration

You can sign up for API keys with the following links:

USPS API: https://www.usps.com/business/web-tools-apis/welcome.htm

Google Maps API: https://developers.google.com/maps/documentation/javascript/get-api-key

### Setup:

After having set your API keys in `config.json`, run `npm install` to install dependencies and that's it!

You can start the program by running `npm start`.

---

This program was tested on Node v8.1.3 running on Debian 8.7 and may not be compatible with previous releases.