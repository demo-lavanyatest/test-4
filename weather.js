const form = document.getElementById("weather-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const errorEl = document.getElementById("error-msg");
const loadingEl = document.getElementById("loading-msg");
const cardEl = document.getElementById("weather-card");

const locationNameEl = document.getElementById("location-name");
const descriptionEl = document.getElementById("weather-description");
const temperatureEl = document.getElementById("temperature");
const feelsLikeEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("wind-speed");

const WMO_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function describeWeatherCode(code) {
  return WMO_CODES[code] || "Unknown conditions";
}

function setError(message) {
  errorEl.textContent = message;
  cityInput.setAttribute("aria-invalid", message ? "true" : "false");
  if (message) {
    cardEl.hidden = true;
  }
}

function setLoading(isLoading) {
  loadingEl.hidden = !isLoading;
  searchBtn.disabled = isLoading;
}

async function fetchCityCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to reach the geocoding service.");
  }
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    const notFound = new Error(`City not found: "${city}". Please check the spelling.`);
    notFound.code = "CITY_NOT_FOUND";
    throw notFound;
  }
  return data.results[0];
}

async function fetchCurrentWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
    latitude
  )}&longitude=${encodeURIComponent(
    longitude
  )}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to fetch weather forecast data.");
  }
  const data = await response.json();
  if (!data.current) {
    throw new Error("Weather data unavailable for this location.");
  }
  return data.current;
}

function renderWeather(place, current) {
  const parts = [place.name, place.admin1, place.country].filter(Boolean);
  locationNameEl.textContent = parts.join(", ");
  descriptionEl.textContent = describeWeatherCode(current.weather_code);
  temperatureEl.textContent = Math.round(current.temperature_2m);
  feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)} °C`;
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windSpeedEl.textContent = `${current.wind_speed_10m} km/h`;
  cardEl.hidden = false;
}

async function handleSearch(cityQuery) {
  const city = cityQuery.trim();
  if (!city) {
    setError("Please enter a city name.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    const place = await fetchCityCoordinates(city);
    const current = await fetchCurrentWeather(place.latitude, place.longitude);
    renderWeather(place, current);
  } catch (err) {
    if (err && err.code === "CITY_NOT_FOUND") {
      setError(err.message);
    } else {
      setError(err.message || "Failed to retrieve weather data. Please try again.");
    }
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSearch(cityInput.value);
});
