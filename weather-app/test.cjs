const fs = require("fs");
const path = require("path");
const vm = require("vm");

class MockElement {
  constructor(id, initialHidden = false) {
    this.id = id;
    this.value = "";
    this._textContent = "";
    this.disabled = false;
    this.listeners = {};
    this.classList = {
      classes: new Set(initialHidden ? ["hidden"] : []),
      add: (...c) => c.forEach((cl) => this.classList.classes.add(cl)),
      remove: (...c) => c.forEach((cl) => this.classList.classes.delete(cl)),
      contains: (cl) => this.classList.classes.has(cl),
    };
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = String(val);
  }

  addEventListener(type, fn) {
    this.listeners[type] = fn;
  }

  focus() {}
}

const elements = {
  "search-form": new MockElement("search-form"),
  "city-input": new MockElement("city-input"),
  "search-btn": new MockElement("search-btn"),
  "error-message": new MockElement("error-message", true),
  "loading-indicator": new MockElement("loading-indicator", true),
  "weather-result": new MockElement("weather-result", true),
  "location-name": new MockElement("location-name"),
  "location-region": new MockElement("location-region"),
  "weather-updated": new MockElement("weather-updated"),
  "weather-icon": new MockElement("weather-icon"),
  "temperature": new MockElement("temperature"),
  "weather-condition": new MockElement("weather-condition"),
  "feels-like": new MockElement("feels-like"),
  "humidity": new MockElement("humidity"),
  "wind-speed": new MockElement("wind-speed"),
  "coordinates": new MockElement("coordinates"),
};

let mockFetchHandler = null;

async function mockFetch(url) {
  if (!mockFetchHandler) throw new Error("No mockFetchHandler configured");
  return mockFetchHandler(url);
}

const document = {
  getElementById: (id) => elements[id] || null,
};

const sandbox = {
  document,
  fetch: mockFetch,
  URLSearchParams,
  encodeURIComponent,
  Math,
  Number,
  String,
  Boolean,
  Error,
  console,
};

vm.createContext(sandbox);
const code = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
vm.runInContext(code, sandbox);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function submitSearch(cityText) {
  elements["city-input"].value = cityText;
  await sandbox.handleSearch({ preventDefault() {} });
}

(async () => {
  console.log("--- Weather Application Test Suite ---");

  // 1. Empty city validation
  console.log("\n1. Input Validation:");
  await submitSearch("   ");
  assert(!elements["error-message"].classList.contains("hidden"), "Error banner shown for empty input");
  assert(elements["error-message"].textContent === "Please enter a city name.", "Correct message for empty input");
  assert(elements["weather-result"].classList.contains("hidden"), "Weather card stays hidden on empty input");

  // 2. Non-letter / single-character validation
  await submitSearch("12345");
  assert(!elements["error-message"].classList.contains("hidden"), "Error banner shown for numeric-only input");
  assert(elements["error-message"].textContent.includes("valid city name"), "Correct validation error for numeric input");

  // 3. Valid city search
  console.log("\n2. Valid City Search (London):");
  mockFetchHandler = async (url) => {
    if (url.includes("geocoding-api.open-meteo.com")) {
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              name: "London",
              admin1: "England",
              country: "United Kingdom",
              latitude: 51.50853,
              longitude: -0.12574,
            },
          ],
        }),
      };
    }
    if (url.includes("api.open-meteo.com/v1/forecast")) {
      return {
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 18.4,
            apparent_temperature: 17.2,
            relative_humidity_2m: 68,
            wind_speed_10m: 14.5,
            weather_code: 2,
          },
        }),
      };
    }
    throw new Error("Unexpected URL: " + url);
  };

  await submitSearch("London");
  assert(elements["error-message"].classList.contains("hidden"), "Error banner hidden on valid search");
  assert(!elements["weather-result"].classList.contains("hidden"), "Weather card displayed on valid search");
  assert(elements["location-name"].textContent === "London", "Displays city name London");
  assert(elements["location-region"].textContent === "England, United Kingdom", "Displays region and country");
  assert(elements["temperature"].textContent === "18", "Displays rounded temperature (18)");
  assert(elements["weather-condition"].textContent === "Partly cloudy", "Maps WMO code 2 to 'Partly cloudy'");
  assert(elements["weather-icon"].textContent === "⛅", "Maps WMO code 2 to partly cloudy icon");
  assert(elements["feels-like"].textContent === "17 °C", "Displays feels-like temperature");
  assert(elements["humidity"].textContent === "68%", "Displays relative humidity");
  assert(elements["wind-speed"].textContent === "14.5 km/h", "Displays wind speed");
  assert(elements["coordinates"].textContent === "51.51, -0.13", "Displays formatted coordinates");

  // 4. Invalid / unknown city handling
  console.log("\n3. Invalid City Error Handling:");
  mockFetchHandler = async (url) => {
    if (url.includes("geocoding-api.open-meteo.com")) {
      return {
        ok: true,
        json: async () => ({ results: [] }),
      };
    }
  };

  await submitSearch("XyzInvalidCityName999");
  assert(!elements["error-message"].classList.contains("hidden"), "Error banner shown for nonexistent city");
  assert(
    elements["error-message"].textContent.includes('City not found: "XyzInvalidCityName999"'),
    "Displays descriptive city not found error"
  );
  assert(elements["weather-result"].classList.contains("hidden"), "Previous weather card hidden when error occurs");

  // 5. Network / API error handling
  console.log("\n4. API / Network Failure Handling:");
  mockFetchHandler = async () => ({
    ok: false,
    status: 503,
  });

  await submitSearch("Paris");
  assert(!elements["error-message"].classList.contains("hidden"), "Error banner shown when API returns HTTP error");
  assert(
    elements["error-message"].textContent.includes("Failed to reach location service"),
    "Displays friendly service error message"
  );
  assert(elements["loading-indicator"].classList.contains("hidden"), "Loading indicator hidden after error completes");
  assert(elements["search-btn"].disabled === false, "Search button re-enabled after request finishes");

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
})();
